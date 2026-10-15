import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { createStorage, prefixStorage } from "../../src/index.ts";
import CloudflareCacheBinding from "../../src/drivers/cloudflare-cache-binding.ts";

// Minimal Map-backed fake of the Cloudflare Workers Cache API, just enough
// surface for the cloudflare-cache-binding driver (match/put/delete) without
// requiring a real Cloudflare runtime or wrangler's platform proxy.
// Like the real Cache API, entries are keyed by the parsed request URL.
function createFakeCaches() {
  const store = new Map<string, Response>();
  const url = (key: string) => new URL(key).href;

  const fakeCache = {
    async match(key: string) {
      const hit = store.get(url(key));
      return hit ? hit.clone() : undefined;
    },
    async put(key: string, value: Response) {
      store.set(url(key), value.clone());
    },
    async delete(key: string) {
      return store.delete(url(key));
    },
  };

  return {
    store,
    default: fakeCache,
    open: async (_name: string) => fakeCache,
  };
}

describe("drivers: cloudflare-cache-binding (fake caches)", () => {
  let fakeCaches: ReturnType<typeof createFakeCaches>;
  let hadCaches: boolean;
  let originalCaches: unknown;

  beforeEach(() => {
    hadCaches = "caches" in globalThis;
    originalCaches = (globalThis as any).caches;
    fakeCaches = createFakeCaches();
    (globalThis as any).caches = fakeCaches;
  });

  afterEach(() => {
    if (hadCaches) {
      (globalThis as any).caches = originalCaches;
    } else {
      delete (globalThis as any).caches;
    }
  });

  test("setItem round-trips through storage.setItem/getItem (regression #789)", async () => {
    const storage = createStorage({
      driver: CloudflareCacheBinding({ base: "nitro-cache" }),
    });

    // This is the exact call path from issue #789: storage.setItem invokes
    // the driver's setItem as a bare (unbound) function. Before the fix,
    // setItem() referenced `this.setItemRaw!`, which throws
    // "Cannot read properties of undefined (reading 'setItemRaw')"
    // because `this` is undefined in that call context.
    await storage.setItem("test", { ok: true }, { ttl: 60 });

    const value = await storage.getItem("test");
    expect(value).toMatchObject({ ok: true });

    await storage.dispose();
  });

  test("applies ttl and tag as cache headers", async () => {
    await using storage = createStorage({
      driver: CloudflareCacheBinding({ base: "nitro-cache", ttl: 30 }),
    });

    await storage.setItem("default-ttl", "a");
    await storage.setItem("custom", "b", { ttl: 60, tag: "my-tag" });

    const defaultTTL = fakeCaches.store.get("unstorage://nitro-cache/default-ttl");
    expect(defaultTTL?.headers.get("Cache-Control")).toBe("max-age=30");
    expect(defaultTTL?.headers.get("Cache-Tag")).toBe(null);

    const custom = fakeCaches.store.get("unstorage://nitro-cache/custom");
    expect(custom?.headers.get("Cache-Control")).toBe("max-age=60");
    expect(custom?.headers.get("Cache-Tag")).toBe("my-tag");
  });

  test("encodes keys so they cannot escape their path", async () => {
    const storage = createStorage({
      driver: CloudflareCacheBinding({ base: "app" }),
    });
    await storage.setItem("users:bob:secret", "bob's secret");

    const alice = prefixStorage(storage, "users:alice");
    expect(await alice.getItem("%2e%2e:bob:secret")).toBeNull();
    await alice.setItem("%2e%2e:bob:secret", "overwritten");
    await alice.setItem("a#b", "x");
    expect(await storage.getItem("users:bob:secret")).toBe("bob's secret");
    expect([...fakeCaches.store.keys()].sort()).toEqual([
      "unstorage://app/users/alice/%252e%252e/bob/secret",
      "unstorage://app/users/alice/a%23b",
      "unstorage://app/users/bob/secret",
    ]);

    await storage.dispose();
  });
});
