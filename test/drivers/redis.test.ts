import { describe, vi, it, expect } from "vitest";
import * as ioredis from "ioredis-mock";
import redisDriver from "../../src/drivers/redis";
import { testDriver } from "./utils";

vi.mock("ioredis", () => ioredis);

describe("drivers: redis (raw: false)", () => {
  const driver = redisDriver({
    base: "test:",
    url: "ioredis://localhost:6379/0",
    lazyConnect: false,
  });

  testDriver({
    driver,
    additionalTests(ctx) {
      it("verify stored keys", async () => {
        await ctx.storage.setItem("s1:a", "test_data");
        await ctx.storage.setItem("s2:a", "test_data");
        await ctx.storage.setItem("s3:a?q=1", "test_data");

        const client = new ioredis.default("ioredis://localhost:6379/0");
        const keys = await client.keys("*");
        expect(keys).toMatchInlineSnapshot(`
          [
            "test:s1:a",
            "test:s2:a",
            "test:s3:a",
          ]
        `);
        await client.disconnect();
      });

      it("saves raw data as a base64 string", async () => {
        const helloBuffer = Buffer.from("Hello, world!", "utf8");
        const byteArray = new Uint8Array(4);
        byteArray[0] = 2;
        byteArray[1] = 0;
        byteArray[2] = 2;
        byteArray[3] = 5;

        await ctx.storage.setItemRaw("s4:a", helloBuffer);
        await ctx.storage.setItemRaw("s5:a", byteArray);

        const client = new ioredis.default("ioredis://localhost:6379/0");

        const bufferValue = await client.get("test:s4:a");
        expect(bufferValue).toEqual("base64:SGVsbG8sIHdvcmxkIQ==");

        const byteArrayValue = await client.get("test:s5:a");
        expect(byteArrayValue).toEqual("base64:AgACBQ==");

        await client.disconnect();
      });

      it("exposes instance", () => {
        expect(driver.getInstance?.()).toBeInstanceOf(ioredis.default);
      });
    },
  });
});

describe("drivers: redis (raw: true)", () => {
  const binaryDriver = redisDriver({
    base: "test:",
    url: "ioredis://localhost:6379/0",
    lazyConnect: false,
    raw: true,
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

        const client = new ioredis.default("ioredis://localhost:6379/0");

        const bufferValue = await client.getBuffer("test:s4:a");
        expect(bufferValue).toEqual(helloBuffer);

        const byteArrayValue = await client.getBuffer("test:s5:a");
        expect(byteArrayValue).toEqual(Buffer.from([2, 0, 2, 5]));

        await client.disconnect();
      });
    },
  });
});
