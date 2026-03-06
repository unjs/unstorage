import { load } from "@tauri-apps/plugin-store";

import { type DriverFactory, normalizeKey } from "./utils/index.ts";

const DRIVER_NAME = "tauri";

export interface TauriStorageDriverOptions {
  /**
   * Path to the store file (e.g. `"store.json"`).
   */
  path: string;
  /**
   * Optional [StoreOptions](https://tauri.app/plugin/store/) (e.g. `autoSave`).
   */
  options?: import("@tauri-apps/plugin-store").StoreOptions;
}

type TauriStore = Awaited<ReturnType<typeof load>>;

const driver: DriverFactory<TauriStorageDriverOptions, Promise<TauriStore>> = (opts) => {
  const storePromise = load(opts.path, opts.options);

  return {
    name: DRIVER_NAME,
    options: opts,
    getInstance: () => storePromise,
    async hasItem(key) {
      const store = await storePromise;
      return store.has(normalizeKey(key));
    },
    async getItem(key) {
      const store = await storePromise;
      return store.get(normalizeKey(key)) ?? null;
    },
    async setItem(key, value) {
      const store = await storePromise;
      await store.set(normalizeKey(key), value);
    },
    async removeItem(key) {
      const store = await storePromise;
      await store.delete(normalizeKey(key));
    },
    async getKeys(basePrefix) {
      const store = await storePromise;
      const prefix = normalizeKey(basePrefix || "");
      const allKeys = await store.keys();
      if (!prefix) {
        return allKeys;
      }
      return allKeys
        .filter((k) => k === prefix || k.startsWith(prefix + ":"));
    },
    async clear(basePrefix) {
      const store = await storePromise;
      const prefix = normalizeKey(basePrefix || "");
      const allKeys = await store.keys();
      const toRemove = prefix
        ? allKeys.filter((k) => k === prefix || k.startsWith(prefix + ":"))
        : allKeys;
      await Promise.all(toRemove.map((k) => store.delete(k)));
    },
    async watch(callback) {
      const store = await storePromise;
      return store.onChange((key, value) => {
        callback(value === null ? "remove" : "update", key);
      });
    },
  };
};

export default driver;
