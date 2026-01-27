import { describe, vi, it, expect } from "vitest";
import * as ioredisMock from "ioredis-mock";
import redisDriver from "../../src/drivers/redis.ts";
import { testDriver } from "./utils.ts";

vi.mock("ioredis", () => ({ ...ioredisMock, Redis: ioredisMock.default }));

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

        const client = new (ioredisMock as any).default(
          "ioredis://localhost:6379/0"
        );
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
        expect(driver.getInstance?.()).toBeInstanceOf(
          (ioredisMock as any).default
        );
      });

      it("sets default clientInfoTag with version", () => {
        const instance = driver.getInstance?.();
        const tag = (instance?.options as any)?.clientInfoTag;
        // Should be either "unstorage_vX.X.X" or "unstorage" (fallback)
        expect(tag).toMatch(/^unstorage(_v[\d.]+.*)?$/);
      });

      it("allows custom clientInfoTag", () => {
        const customDriver = redisDriver({
          base: "test:",
          url: "ioredis://localhost:6379/0",
          lazyConnect: false,
          clientInfoTag: "my-custom-app",
        });
        const instance = customDriver.getInstance?.();
        expect((instance?.options as any)?.clientInfoTag).toBe("my-custom-app");
      });
    },
  });
});
