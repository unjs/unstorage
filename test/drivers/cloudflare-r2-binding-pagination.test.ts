import { describe, test, expect } from "vitest";
import { createStorage } from "../../src/index.ts";
import CloudflareR2Binding from "../../src/drivers/cloudflare-r2-binding.ts";

describe("drivers: cloudflare-r2-binding pagination", () => {
  const PAGE = 1000;
  const createFakeBucket = (count: number) => {
    const store = new Set(
      Array.from({ length: count }, (_, i) => `k${String(i).padStart(5, "0")}`),
    );
    const deleteCalls: number[] = [];
    const bucket = {
      get: async () => null,
      put: async () => null,
      async list(o: { prefix?: string; cursor?: string } = {}) {
        const all = [...store].sort().filter((k) => !o.prefix || k.startsWith(o.prefix));
        const start = o.cursor ? Number(o.cursor) : 0;
        const objects = all.slice(start, start + PAGE).map((key) => ({ key }));
        const truncated = start + PAGE < all.length;
        return { objects, truncated, cursor: truncated ? String(start + PAGE) : undefined };
      },
      async delete(keys: string | string[]) {
        const arr = Array.isArray(keys) ? keys : [keys];
        if (arr.length > PAGE) throw new Error("too many keys");
        deleteCalls.push(arr.length);
        for (const k of arr) store.delete(k);
      },
    };
    return { bucket, store, deleteCalls };
  };

  test("getKeys returns more than 1000 keys", async () => {
    const { bucket } = createFakeBucket(2500);
    const storage = createStorage({ driver: CloudflareR2Binding({ binding: bucket as any }) });
    expect(await storage.getKeys()).toHaveLength(2500);
  });

  test("clear removes more than 1000 keys", async () => {
    const { bucket, store, deleteCalls } = createFakeBucket(2500);
    const storage = createStorage({ driver: CloudflareR2Binding({ binding: bucket as any }) });
    await storage.clear();
    expect(store.size).toBe(0);
    expect(deleteCalls).toEqual([1000, 1000, 500]);
  });
});
