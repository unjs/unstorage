import type AsyncStorage from "@react-native-async-storage/async-storage";

import {
  type DriverFactory,
  type DriverDependencies,
  importLib,
  joinKeys,
  type LibImport,
  normalizeKey,
} from "./utils/index.ts";

export const DRIVER_DEPENDENCIES: DriverDependencies = {
  lib: { name: "@react-native-async-storage/async-storage", version: "^2 || ^3" },
};

const DRIVER_NAME = "react-native-async-storage";

export interface ReactNativeAsyncStorageOptions {
  base?: string;
  /** Optionally provide AsyncStorage to avoid dynamically importing it. */
  lib?: LibImport<typeof AsyncStorage>;
}

const driver: DriverFactory<ReactNativeAsyncStorageOptions, Promise<typeof AsyncStorage>> = (opts) => {
  const base = normalizeKey(opts?.base);
  const resolveKey = (key: string) => joinKeys(base, key);
  let storage: Promise<typeof AsyncStorage> | undefined;
  const getStorage = () =>
    (storage ??= importLib(
      DRIVER_NAME,
      "@react-native-async-storage/async-storage",
      opts?.lib,
      () => import("@react-native-async-storage/async-storage"),
    ));

  return {
    name: DRIVER_NAME,
    options: opts,
    getInstance: () => getStorage(),
    async hasItem(key) {
      return (await (await getStorage()).getItem(resolveKey(key))) !== null;
    },
    async getItem(key) {
      return (await getStorage()).getItem(resolveKey(key));
    },
    async getItemRaw(key) {
      return (await getStorage()).getItem(resolveKey(key));
    },
    async setItem(key, value) {
      await (await getStorage()).setItem(resolveKey(key), value);
    },
    async setItemRaw(key, value) {
      await (await getStorage()).setItem(resolveKey(key), value);
    },
    async removeItem(key) {
      await (await getStorage()).removeItem(resolveKey(key));
    },
    async getKeys() {
      const prefix = base ? `${base}:` : "";
      return (await (await getStorage()).getAllKeys())
        .filter((key) => !prefix || key.startsWith(prefix))
        .map((key) => (prefix ? key.slice(prefix.length) : key));
    },
    async clear(prefix) {
      const storage = await getStorage();
      const keyPrefix = resolveKey(prefix || "");
      if (!keyPrefix) {
        await storage.clear();
        return;
      }
      const keys = await storage.getAllKeys();
      await storage.multiRemove(keys.filter((key) => key === keyPrefix || key.startsWith(`${keyPrefix}:`)));
    },
  };
};

export default driver;
