import { it, describe, expect, vi, afterEach } from "vitest";
import driver from "../../src/drivers/lru-cache";
import { testDriver } from "./utils";
import { LRUCache } from "lru-cache";

describe("drivers: lru-cache", () => {
  testDriver({
    driver: driver({}),
  });
});

describe("drivers: lru-cache with size", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  testDriver({
    driver: driver({
      maxEntrySize: 50,
    }),
    additionalTests(ctx) {
      it("should not store large items", async () => {
        await ctx.storage.setItem(
          "big",
          "0123456789012345678901234567890123456789012345678901234567890123456789"
        );
        expect(await ctx.storage.getItem("big")).toBe(null);

        await ctx.storage.setItemRaw("bigBuff", Buffer.alloc(100));
        expect(await ctx.storage.getItemRaw("bigBuff")).toBe(null);
      });

      it("should pass `setItem` options through", async () => {
        const spy = vi.spyOn(LRUCache.prototype, "set");
        await ctx.storage.setItem("foo", "test_data", {
          noUpdateTTL: true,
        });

        expect(spy).toHaveBeenCalledWith("foo", "test_data", {
          noUpdateTTL: true,
        });
      });

      it("should pass `setItemRaw` options through", async () => {
        const spy = vi.spyOn(LRUCache.prototype, "set");
        await ctx.storage.setItemRaw("foo", "test_data", {
          noUpdateTTL: true,
        });

        expect(spy).toHaveBeenCalledWith("foo", "test_data", {
          noUpdateTTL: true,
        });
      });

      it("should pass `hasItem` options through", async () => {
        const spy = vi.spyOn(LRUCache.prototype, "has");
        await ctx.storage.hasItem("foo", {
          updateAgeOnHas: true,
        });

        expect(spy).toHaveBeenCalledWith("foo", {
          updateAgeOnHas: true,
        });
      });
    },
  });
});
