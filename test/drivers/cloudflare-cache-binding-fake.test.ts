import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { createStorage } from "../../src/index.ts";
import CloudflareCacheBinding from "../../src/drivers/cloudflare-cache-binding.ts";

// Minimal Map-backed fake of the Cloudflare Workers Cache API, just enough
// surface for the cloudflare-cache-binding driver (match/put/delete) without
// requiring a real Cloudflare runtime or wrangler's platform proxy.
function createFakeCaches() {
  const store = new Map<string, Response>();

  const fakeCache = {
    async match(key: string) {
      const hit = store.get(key);
      return hit ? hit.clone() : undefined;
    },
    async put(key: string, value: Response) {
      store.set(key, value.clone());
    },
    async delete(key: string) {
      return store.delete(key);
    },
  };

  return {
    default: fakeCache,
    open: async (_name: string) => fakeCache,
  };
}

describe("drivers: cloudflare-cache-binding (fake caches)", () => {
  let originalCaches: unknown;

  beforeEach(() => {
    originalCaches = (globalThis as any).caches;
    (globalThis as any).caches = createFakeCaches();
  });

  afterEach(() => {
    (globalThis as any).caches = originalCaches;
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
});
