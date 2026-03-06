import { load } from "@tauri-apps/plugin-store";

import { type DriverFactory, joinKeys, normalizeKey } from "./utils/index.ts";

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
  /**
   * Optional prefix for all keys (namespace).
   */
  base?: string;
}

type TauriStore = Awaited<ReturnType<typeof load>>;

const driver: DriverFactory<TauriStorageDriverOptions, Promise<TauriStore>> = (opts) => {
  const base = normalizeKey(opts?.base || "");
  const resolveKey = (key: string) => joinKeys(base, key);

  const storePromise = load(opts.path, opts.options);

  return {
    name: DRIVER_NAME,
    options: opts,
    getInstance: () => storePromise as Promise<TauriStore>,
    async hasItem(key) {
      const store = await storePromise;
      return store.has(resolveKey(key));
    },
    async getItem(key) {
      const store = await storePromise;
      return store.get(resolveKey(key)) ?? null;
    },
    async setItem(key, value) {
      const store = await storePromise;
      await store.set(resolveKey(key), value);
    },
    async removeItem(key) {
      const store = await storePromise;
      await store.delete(resolveKey(key));
    },
    async getKeys(basePrefix) {
      const store = await storePromise;
      const prefix = resolveKey(basePrefix || "");
      const allKeys = await store.keys();
      if (!prefix) {
        return base ? allKeys.map((k) => (k.startsWith(base + ":") ? k.slice(base.length + 1) : k)).filter(Boolean) : allKeys;
      }
      return allKeys
        .filter((k) => k === prefix || k.startsWith(prefix + ":"))
        .map((k) => (base ? k.slice(base.length + 1) : k))
        .filter(Boolean);
    },
    async clear(basePrefix) {
      const store = await storePromise;
      const prefix = resolveKey(basePrefix || "");
      const allKeys = await store.keys();
      const toRemove = prefix
        ? allKeys.filter((k) => k === prefix || k.startsWith(prefix + ":"))
        : base
          ? allKeys.filter((k) => k === base || k.startsWith(base + ":"))
          : allKeys;
      await Promise.all(toRemove.map((k) => store.delete(k)));
    },
    async watch(callback) {
      const store = await storePromise;
      return store.onChange((_key, _value) => {
        callback("update", _key);
      });
    },
  };
};

export default driver;
