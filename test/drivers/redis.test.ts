import { describe, vi, it, expect } from "vitest";
import * as ioredis from "ioredis-mock";
import redisDriver from "../../src/drivers/redis";
import { testDriver } from "./utils";

vi.mock("ioredis", () => ioredis);

describe("drivers: redis", () => {
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

      it("exposes instance", () => {
        expect(driver.getInstance?.()).toBeInstanceOf(ioredis.default);
      });
    },
  });
});
