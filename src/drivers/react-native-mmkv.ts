import { type Configuration, MMKV } from "react-native-mmkv";

import { type DriverFactory, joinKeys, normalizeKey } from "./utils/index.ts";

const DRIVER_NAME = "react-native-mmkv";

export interface ReactNativeMmkvDriverOptions extends Configuration {
  /**
   * Optional prefix for all keys (namespace).
   */
  base?: string;
}

const driver: DriverFactory<ReactNativeMmkvDriverOptions, MMKV> = (opts) => {
  const { base: baseOpt, ...mmkvConfig } = opts ?? {};
  const base = normalizeKey(baseOpt || "");
  const resolveKey = (key: string) => joinKeys(base, key);

  const mmkv = new MMKV({
    id: "mmkv.default",
    ...mmkvConfig,
  } as Configuration);

  return {
    name: DRIVER_NAME,
    options: opts,
    getInstance: () => mmkv,
    hasItem(key) {
      return mmkv.contains(resolveKey(key));
    },
    getItem(key) {
      const value = mmkv.getString(resolveKey(key));
      return value ?? null;
    },
    setItem(key, value) {
      mmkv.set(resolveKey(key), value);
    },
    removeItem(key) {
      mmkv.delete(resolveKey(key));
    },
    getKeys(basePrefix) {
      const prefix = resolveKey(basePrefix || "");
      const allKeys = mmkv.getAllKeys();
      if (!prefix) {
        return base
          ? allKeys
              .filter((k) => k === base || k.startsWith(base + ":"))
              .map((k) => k.slice(base.length + 1))
          : allKeys;
      }
      return allKeys
        .filter((k) => k === prefix || k.startsWith(prefix + ":"))
        .map((k) => (base ? k.slice(base.length + 1) : k))
        .filter(Boolean);
    },
    clear(basePrefix) {
      const prefix = resolveKey(basePrefix || "");
      const allKeys = mmkv.getAllKeys();
      const toRemove = prefix
        ? allKeys.filter((k) => k === prefix || k.startsWith(prefix + ":"))
        : base
          ? allKeys.filter((k) => k === base || k.startsWith(base + ":"))
          : allKeys;
      for (const k of toRemove) {
        mmkv.delete(k);
      }
    },
    watch(callback) {
      const listener = mmkv.addOnValueChangedListener((key) => {
        callback("update", key);
      });
      return () => listener.remove();
    },
  };
};

export default driver;
