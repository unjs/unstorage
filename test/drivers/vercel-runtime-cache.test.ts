import { describe, it, expect, vi, afterEach } from "vitest";
import { createStorage } from "../../src";
import vercelRuntimeCacheDriver from "../../src/drivers/vercel-runtime-cache";
import { testDriver } from "./utils";

const SYMBOL_FOR_REQ_CONTEXT = Symbol.for("@vercel/request-context");

// Minimal Map-backed fake of the cache Vercel exposes on each request's context.
function createFakeRequestCache() {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    expireTag: vi.fn(async () => {}),
  };
}

function setRequestCache(cache: ReturnType<typeof createFakeRequestCache>) {
  (globalThis as any)[SYMBOL_FOR_REQ_CONTEXT] = { get: () => ({ cache }) };
}

describe("drivers: vercel-runtime-cache (request context)", () => {
  afterEach(() => {
    delete (globalThis as any)[SYMBOL_FOR_REQ_CONTEXT];
  });

  it("uses the current request's cache instead of the first one it saw", async () => {
    const storage = createStorage({
      driver: vercelRuntimeCacheDriver({ base: "test" }),
    });

    const first = createFakeRequestCache();
    setRequestCache(first);
    await storage.setItem("key", "value");

    // A later request on the same instance, once the first request's token has expired.
    const later = createFakeRequestCache();
    setRequestCache(later);
    await storage.getItem("key");
    await storage.setItem("key", "value");
    await storage.removeItem("key");

    expect(first.get).not.toHaveBeenCalled();
    expect(first.set).toHaveBeenCalledOnce();
    expect(later.get).toHaveBeenCalledWith("test:key");
    expect(later.set).toHaveBeenCalledWith(
      "test:key",
      "value",
      expect.anything()
    );
    expect(later.delete).toHaveBeenCalledWith("test:key");
  });
});

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
