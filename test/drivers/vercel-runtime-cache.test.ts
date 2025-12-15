import { describe, it, expect } from "vitest";
import vercelRuntimeCacheDriver from "../../src/drivers/vercel-runtime-cache.ts";
import { testDriver } from "./utils.ts";

describe("drivers: vercel-runtime-cache", async () => {
  testDriver({
    driver: vercelRuntimeCacheDriver({
      base: Math.round(Math.random() * 1_000_000).toString(16),
      // Configure tags so clear() can expire them
      tags: ["unstorage-test"],
    }),
    noKeysSupport: true,
    additionalTests: (c) => {
      it("set/get/has/remove", async () => {
        expect(await c.storage.hasItem("k1")).toBe(false);
        await c.storage.setItem("k1", "v1");
        expect(await c.storage.hasItem("k1")).toBe(true);
        expect(await c.storage.getItem("k1")).toBe("v1");
        await c.storage.removeItem("k1");
        expect(await c.storage.hasItem("k1")).toBe(false);
        expect(await c.storage.getItem("k1")).toBe(null);
      });

      it("getMeta returns {} for existing and null for missing", async () => {
        await c.storage.setItem("meta-key", "meta-value");
        expect(await c.storage.getMeta("meta-key")).toMatchObject({});
        await c.storage.removeItem("meta-key");
        expect(await c.storage.getItem("meta-key")).toBe(null);
        expect(await c.storage.hasItem("meta-key")).toBe(false);
      });

      it("getKeys is not supported (returns empty list)", async () => {
        await c.storage.setItem("a", "1");
        await c.storage.setItem("b", "2");
        expect(await c.storage.getKeys()).toMatchObject([]);
      });

      it("clear expires by tags when configured", async () => {
        await c.storage.setItem("t:1", "v");
        expect(await c.storage.getItem("t:1")).toBe("v");
        await c.storage.clear();
        expect(await c.storage.getItem("t:1")).toBe(null);
      });
    },
  });
});
