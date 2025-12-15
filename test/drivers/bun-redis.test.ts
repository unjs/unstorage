import { RedisClient } from "bun";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bunRedisDriver from "../../src/drivers/bun-redis.ts";
import { testDriver } from "./utils.ts";

describe("drivers: bun-redis", () => {
  let testRedisClient: RedisClient;

  beforeAll(async () => {
    testRedisClient = new RedisClient("redis://localhost:6379");
    try {
      await testRedisClient.connect();
    } catch {
      // Redis might not be available, tests will be skipped
    }
  });

  afterAll(async () => {
    testRedisClient?.close();
  });

  const driver = bunRedisDriver({
    base: "test:",
    url: "redis://localhost:6379",
  });

  testDriver({
    driver,
    additionalTests(ctx) {
      it("verify stored keys", async () => {
        await ctx.storage.setItem("s1:a", "test_data");
        await ctx.storage.setItem("s2:a", "test_data");
        await ctx.storage.setItem("s3:a?q=1", "test_data");

        const keys = await testRedisClient.keys("test:*");
        expect(keys).toMatchInlineSnapshot(`
          [
            "test:s1:a",
            "test:s2:a",
            "test:s3:a",
          ]
        `);
      });

      it("exposes instance", () => {
        expect(driver.getInstance?.()).toBeInstanceOf(RedisClient);
      });
    },
  });
});
