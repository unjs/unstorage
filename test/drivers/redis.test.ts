import { describe, vi, it, expect } from "vitest";
import ioredisMock from "ioredis-mock";
import redisDriver from "../../src/drivers/redis.ts";
import { testDriver } from "./utils.ts";

vi.mock("ioredis", () => ({ ...ioredisMock, Redis: ioredisMock.default }));

describe("drivers: redis", () => {
  const binaryDriver = redisDriver({
    base: "test:",
    url: "ioredis://localhost:6379/0",
    lazyConnect: false,
  });

  testDriver({
    driver: binaryDriver,
    additionalTests(ctx) {
      it("saves raw data as binary", async () => {
        const helloBuffer = Buffer.from("Hello, world!", "utf8");
        const byteArray = new Uint8Array(4);
        byteArray[0] = 2;
        byteArray[1] = 0;
        byteArray[2] = 2;
        byteArray[3] = 5;

        await ctx.storage.setItemRaw("s4:a", helloBuffer);
        await ctx.storage.setItemRaw("s5:a", byteArray);

        const client = new ioredisMock.default("ioredis://localhost:6379/0");

        const bufferValue = await client.getBuffer("test:s4:a");
        expect(bufferValue).toEqual(helloBuffer);

        const byteArrayValue = await client.getBuffer("test:s5:a");
        expect(byteArrayValue).toEqual(Buffer.from([2, 0, 2, 5]));

        await client.disconnect();
      });
    },
  });
});
