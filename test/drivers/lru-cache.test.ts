import { it, describe, expect } from "vitest";
import driver from "../../src/drivers/lru-cache.ts";
import { testDriver } from "./utils.ts";

describe("drivers: lru-cache", () => {
  testDriver({
    driver: driver({}),
  });
});

describe("drivers: lru-cache with size", () => {
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
    },
  });
});
