import { it, describe, expect } from "vitest";
import driver from "../../src/drivers/memory-meta";
import { testDriver } from "./utils";

describe("drivers: memory-meta", () => {
  testDriver({
    driver: driver({}),
    additionalTests(ctx) {
      it("should supports meta", async () => {
        await ctx.storage.setItem("key", "value");
        const meta = await ctx.storage.getMeta("key");

        expect(meta.birthtime).toBeInstanceOf(Date);
      });

      it("should set and get a key within ttl", async () => {
        await ctx.storage.setItem("key", "value", { ttl: 1000 });
        await new Promise((resolve) => setTimeout(resolve, 500));

        const meta = await ctx.storage.getMeta("key");
        expect(meta.ttl).toBeDefined();
        expect(meta.ttl).toBeLessThan(1000);

        await new Promise((resolve) => setTimeout(resolve, 501));

        const dataAfter = await ctx.storage.getItem("key");
        expect(dataAfter).toBeNull();
      });
    },
  });
});
