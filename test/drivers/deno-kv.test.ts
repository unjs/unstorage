import { test } from "vitest";
import { createStorage, type Storage } from "../../src";
import kv, { DenoKVOptions } from "../../src/drivers/deno-kv";

const HAS_DENO_KV_LOCAL = false;

const denoKVtest = test.extend<{
  createStorage: (opts: DenoKVOptions) => Storage;
  run: (storage: Storage) => Promise<void>;
}>({
  createStorage: async ({}, use) => {
    use((opts) => {
      return createStorage({
        driver: kv(opts),
      });
    });
  },
  run: async ({ expect }, use) => {
    use(async (storage: Storage) => {
      await storage.setItem("testKey", "testValue");
      const value = await storage.getItem("testKey");
      expect(value).toBe("testValue");

      // Test hasItem
      const hasItem = await storage.hasItem("testKey");
      expect(hasItem).toBe(true);

      // Test removeItem
      await storage.removeItem("testKey");
      const removedValue = await storage.getItem("testKey");
      expect(removedValue).toBe(null);

      // Test getKeys
      await storage.setItem("testKey1", "testValue1");
      await storage.setItem("testKey2", "testValue2");
      const keys = await storage.getKeys();
      expect(keys).toEqual(expect.arrayContaining(["testKey1", "testKey2"]));
      // Test clear
      await storage.clear();
      const newKeys = await storage.getKeys();
      expect(newKeys).toHaveLength(0);

      // Test dispose
      await storage.dispose();
      expect(async () => {
        await storage.setItem("testKey", "testValue");
      }).rejects.toThrowError();
    });
  },
});

denoKVtest("in memory w/ prefix", async ({ createStorage, run }) => {
  const storage = createStorage({
    prefix: "unstorage",
  });
  await run(storage);
});

denoKVtest("in memory w/ no prefix", async ({ createStorage, run }) => {
  const storage = createStorage({});
  await run(storage);
});

denoKVtest.runIf(HAS_DENO_KV_LOCAL)(
  "url and access token",
  async ({ createStorage, run }) => {
    const storage = createStorage({
      path: "http://0.0.00:4512",
      accessToken: "MYPASSWORD1234",
    });
    await run(storage);
  }
);

denoKVtest.skipIf(HAS_DENO_KV_LOCAL)(
  "url and access token",
  async ({ expect, createStorage, run }) => {
    expect(async () => {
      const storage = createStorage({
        path: "http://0.0.00:4512",
        accessToken: "MYPASSWORD1234",
      });
      await run(storage);
    }).rejects.toThrow();
  }
);
