import { it, describe, expect, vi, beforeEach, afterEach } from "vitest";
import driver from "../../src/drivers/lru-cache";
import { testDriver } from "./utils";
import { createStorage } from "../../src";

describe("drivers: lru-cache", () => {
  testDriver({
    driver: driver(),
  });
});

describe("drivers: lru-cache with size", () => {
  testDriver({
    driver: driver({
      maxEntrySize: 50,
    }),
    additionalTests({ storage }) {
      it("should not store large items", async () => {
        await storage.setItem(
          "big",
          "0123456789012345678901234567890123456789012345678901234567890123456789"
        );
        expect(await storage.getItem("big")).toBe(null);

        await storage.setItemRaw("bigBuff", Buffer.alloc(100));
        expect(await storage.getItemRaw("bigBuff")).toBe(null);
      });
    },
  });
});

describe("drivers: lru-cache with TTL and stale-while-revalidate cache", () => {
  it("should get the value from the fetchMethod and then from cache", async () => {
    const fetchMethodTestSpy = vi.fn();
    const storage = createStorage({
      driver: driver({
        max: 10,
        ttl: 50,
        allowStale: true,
        fetchMethod: async (key, value, options) => {
          fetchMethodTestSpy(key, value);
          return "ourTestValue";
        },
      }),
    });

    const value = await storage.getItem("test");
    expect(value).toBe("ourTestValue");
    const secondCheck = await storage.getItem("test");
    expect(secondCheck).toBe("ourTestValue");

    expect(fetchMethodTestSpy).toHaveBeenCalledTimes(1);
  });

  it("[stale-while-revalidate] should return cached value while refreshing for the new value", async () => {
    const fetchMethodTestSpy = vi.fn();
    const storage = createStorage({
      driver: driver({
        max: 10,
        ttl: 50,
        allowStale: true,
        fetchMethod: async (key, value, options) => {
          fetchMethodTestSpy(key, value);
          // first time when there is no cached value we return the first string
          if (!value) {
            return "stale-test-value";
          }
          return "stale-test-value-after-revalidate";
        },
      }),
    });

    // first time we're invoking the fetchMethod and get value from it
    const firstRead = await storage.getItem("stale-test-key");
    expect(firstRead).toBe("stale-test-value");

    // when TTL expired we're still getting the value from the cache and it's refreshed under the hood
    await new Promise((resolve) => setTimeout(resolve, 100));
    const secondRead = await storage.getItem("stale-test-key");
    expect(secondRead).toBe("stale-test-value");

    // the next read after that should return refreshed value
    const thirdRead = await storage.getItem("stale-test-key");
    expect(thirdRead).toBe("stale-test-value-after-revalidate");

    // fetchMethod should be called only twice - once on init and once after TTL expired
    expect(fetchMethodTestSpy).toHaveBeenCalledTimes(2);
  });
});
