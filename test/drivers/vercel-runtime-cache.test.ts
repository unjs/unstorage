import { describe, it, expect, vi, afterEach } from "vitest";
import { createStorage } from "../../src/index.ts";
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

describe("drivers: vercel-runtime-cache (key encoding)", () => {
  const SYMBOL_FOR_REQ_CONTEXT = Symbol.for("@vercel/request-context");
  afterEach(() => {
    delete (globalThis as any)[SYMBOL_FOR_REQ_CONTEXT];
  });

  it("encodes keys so they cannot escape the cache endpoint", async () => {
    const cache = {
      get: vi.fn(async () => undefined),
      set: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
      expireTag: vi.fn(async () => {}),
    };
    (globalThis as any)[SYMBOL_FOR_REQ_CONTEXT] = { get: () => ({ cache }) };
    const storage = createStorage({ driver: vercelRuntimeCacheDriver({}) });

    await storage.setItem("a#b", "x");
    await storage.setItem("%2e%2e", "x");
    await storage.setItem("x:.\t.", "x");
    expect(cache.set.mock.calls.map((call: any[]) => call[0])).toEqual([
      "a%23b",
      "%252e%252e",
      "x:.%09.",
    ]);

    for (const key of ["", ":", ".", ".."]) {
      await expect(storage.removeItem(key)).rejects.toThrow("Invalid key");
    }
    expect(cache.delete).not.toHaveBeenCalled();
  });
});
