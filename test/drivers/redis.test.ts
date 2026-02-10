import { describe, vi, it, expect, beforeAll } from "vitest";
import * as ioredisMock from "ioredis-mock";
import redisDriver from "../../src/drivers/redis.ts";
import { testDriver } from "./utils.ts";

const useRealRedis = vi.hoisted(() => Boolean(process.env.VITE_REDIS_URL));

vi.mock("ioredis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ioredis")>();
  if (useRealRedis) {
    return actual;
  }
  return {
    ...actual,
    ...ioredisMock,
    Redis: ioredisMock.default,
    Cluster: (ioredisMock as any).Cluster || actual.Cluster,
  };
});

describe("drivers: redis", () => {
  let RedisClient: any;
  beforeAll(async () => {
    if (useRealRedis) {
      const mod = await import("ioredis");
      RedisClient = mod.Redis;
    } else {
      RedisClient = (ioredisMock as any).default;
    }
  });

  const redisUrl = process.env.VITE_REDIS_URL || "redis://localhost:6379/0";
  const driver = redisDriver({
    base: "test:",
    url: redisUrl,
    lazyConnect: false,
  });

  const ensureMockConfig = () => {
    if (useRealRedis) {
      return;
    }
    const client = driver.getInstance?.() as any;
    if (client && typeof client.config === "function") {
      client.config = () => Promise.resolve("OK");
    }
  };

  testDriver({
    driver,
    additionalTests(ctx) {
      it("verify stored keys", async () => {
        await ctx.storage.setItem("s1:a", "test_data");
        await ctx.storage.setItem("s2:a", "test_data");
        await ctx.storage.setItem("s3:a?q=1", "test_data");

        const client = new RedisClient(redisUrl);
        const keys = (await client.keys("*")).sort();
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
        expect(driver.getInstance?.()).toBeInstanceOf(RedisClient);
      });

      it("watch redis", async () => {
        ensureMockConfig();
        const watcher = vi.fn();
        const unwatch = await ctx.storage.watch(watcher);
        await new Promise((resolve) => setTimeout(resolve, 10));

        const publisher = new RedisClient(redisUrl);
        await publisher.publish("__keyspace@0__:test:s1:a", "set");
        await publisher.publish("__keyspace@0__:test:s2:a", "del");
        await publisher.publish("__keyspace@0__:other:s3:a", "set");
        await publisher.disconnect();

        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(watcher).toHaveBeenCalledWith("update", "s1:a");
        expect(watcher).toHaveBeenCalledWith("remove", "s2:a");
        expect(watcher).toHaveBeenCalledTimes(2);
        await unwatch();
      });

      it("unwatch redis", async () => {
        ensureMockConfig();
        const watcher = vi.fn();
        const unwatch = await ctx.storage.watch(watcher);
        await new Promise((resolve) => setTimeout(resolve, 10));

        const publisher = new RedisClient(redisUrl);
        await publisher.publish("__keyspace@0__:test:s1:a", "set");
        await new Promise((resolve) => setTimeout(resolve, 0));

        await unwatch();

        await publisher.publish("__keyspace@0__:test:s1:b", "set");
        await publisher.disconnect();

        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(watcher).toHaveBeenCalledTimes(1);
        expect(watcher).toHaveBeenCalledWith("update", "s1:a");
      });
    },
  });
});
