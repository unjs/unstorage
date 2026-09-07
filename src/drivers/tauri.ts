import {
  type DriverDependencies,
  type DriverFactory,
  importLib,
  joinKeys,
  type LibImport,
  normalizeKey,
} from "./utils/index.ts";

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
  /**
   * Optionally provide the [`@tauri-apps/plugin-store`](https://www.npmjs.com/package/@tauri-apps/plugin-store)
   * library to avoid dynamically importing it.
   */
  lib?: LibImport<typeof import("@tauri-apps/plugin-store")>;
}

export const DRIVER_DEPENDENCIES: DriverDependencies = {
  lib: { name: "@tauri-apps/plugin-store", version: "^2.0.0" },
};

const DRIVER_NAME = "tauri";

type TauriStore = import("@tauri-apps/plugin-store").Store;

const driver: DriverFactory<TauriStorageDriverOptions, Promise<TauriStore>> = (opts) => {
  const base = normalizeKey(opts?.base || "");
  const resolveKey = (key: string) => joinKeys(base, key);

  const storePromise = importLib(
    DRIVER_NAME,
    "@tauri-apps/plugin-store",
    opts?.lib,
    () => import("@tauri-apps/plugin-store"),
  ).then((lib) => lib.load(opts.path, opts.options));

  return {
    name: DRIVER_NAME,
    options: opts,
    getInstance: () => storePromise,
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
        return base
          ? allKeys
              .filter((k) => k === base || k.startsWith(base + ":"))
              .map((k) => k.slice(base.length + 1))
              .filter(Boolean)
          : allKeys;
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
      const unlisten = await store.onChange((key, value) => {
        if (!base || key === base || key.startsWith(base + ":")) {
          const eventKey = base ? key.slice(base.length + 1) : key;
          callback(value === null ? "remove" : "update", eventKey);
        }
      });
      return () => unlisten();
    },
  };
};

export default driver;
