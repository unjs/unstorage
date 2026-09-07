import {
  type DriverDependencies,
  type DriverFactory,
  importLib,
  joinKeys,
  type LibImport,
  normalizeKey,
} from "./utils/index.ts";

const DRIVER_NAME = "react-native-mmkv";

export interface ReactNativeMmkvDriverOptions extends Omit<
  import("react-native-mmkv").Configuration,
  "id"
> {
  /**
   * The MMKV instance's ID. Defaults to `"mmkv.default"`.
   */
  id?: string;
  /**
   * Optional prefix for all keys (namespace).
   */
  base?: string;
  /**
   * Optionally provide the [`react-native-mmkv`](https://github.com/mrousavy/react-native-mmkv)
   * library to avoid dynamically importing it.
   */
  lib?: LibImport<typeof import("react-native-mmkv")>;
}

export const DRIVER_DEPENDENCIES: DriverDependencies = {
  lib: { name: "react-native-mmkv", version: "^4.0.0" },
};

type MmkvInstance = import("react-native-mmkv").MMKV;

const driver: DriverFactory<ReactNativeMmkvDriverOptions, Promise<MmkvInstance>> = (opts) => {
  const { base: baseOpt, lib: _lib, id, ...mmkvConfig } = opts ?? {};
  const base = normalizeKey(baseOpt || "");
  const resolveKey = (key: string) => joinKeys(base, key);

  const mmkvPromise = importLib(
    DRIVER_NAME,
    "react-native-mmkv",
    opts?.lib,
    () => import("react-native-mmkv"),
  ).then((lib) => lib.createMMKV({ id: id ?? "mmkv.default", ...mmkvConfig }));

  return {
    name: DRIVER_NAME,
    options: opts,
    getInstance: () => mmkvPromise,
    async hasItem(key) {
      const mmkv = await mmkvPromise;
      return mmkv.contains(resolveKey(key));
    },
    async getItem(key) {
      const mmkv = await mmkvPromise;
      return mmkv.getString(resolveKey(key)) ?? null;
    },
    async setItem(key, value) {
      const mmkv = await mmkvPromise;
      mmkv.set(resolveKey(key), value);
    },
    async removeItem(key) {
      const mmkv = await mmkvPromise;
      mmkv.remove(resolveKey(key));
    },
    async getKeys(basePrefix) {
      const mmkv = await mmkvPromise;
      const prefix = resolveKey(basePrefix || "");
      const allKeys = mmkv.getAllKeys();
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
      const mmkv = await mmkvPromise;
      const prefix = resolveKey(basePrefix || "");
      const allKeys = mmkv.getAllKeys();
      const toRemove = prefix
        ? allKeys.filter((k) => k === prefix || k.startsWith(prefix + ":"))
        : base
          ? allKeys.filter((k) => k === base || k.startsWith(base + ":"))
          : allKeys;
      for (const k of toRemove) {
        mmkv.remove(k);
      }
    },
    async watch(callback) {
      const mmkv = await mmkvPromise;
      const listener = mmkv.addOnValueChangedListener((key) => {
        if (base && key !== base && !key.startsWith(base + ":")) {
          return;
        }
        const scopedKey = base ? (key === base ? "" : key.slice(base.length + 1)) : key;
        callback("update", scopedKey);
      });
      return () => listener.remove();
    },
  };
};

export default driver;
