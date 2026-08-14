import type { Preferences } from "@capacitor/preferences";

import {
  type DriverFactory,
  importLib,
  joinKeys,
  type LibImport,
  normalizeKey,
  type DriverDependencies,
} from "./utils/index.ts";

export const DRIVER_DEPENDENCIES: DriverDependencies = {
  lib: { name: "@capacitor/preferences", version: "^6 || ^7 || ^8" },
};

const DRIVER_NAME = "capacitor-preferences";

export interface CapacitorPreferencesOptions {
  base?: string;

  /**
   * Optionally provide the [`@capacitor/preferences`](https://www.npmjs.com/package/@capacitor/preferences)
   * library to avoid dynamically importing it.
   */
  lib?: LibImport<typeof import("@capacitor/preferences")>;
}

const driver: DriverFactory<CapacitorPreferencesOptions, Promise<typeof Preferences>> = (opts) => {
  const base = normalizeKey(opts?.base || "");
  const resolveKey = (key: string) => joinKeys(base, key);

  let _prefs: Promise<typeof Preferences> | undefined;
  const getPreferences = () =>
    (_prefs ??= importLib(
      DRIVER_NAME,
      "@capacitor/preferences",
      opts?.lib,
      () => import("@capacitor/preferences"),
    ).then((lib) => lib.Preferences));

  return {
    name: DRIVER_NAME,
    options: opts,
    getInstance: getPreferences,
    async hasItem(key) {
      const { keys } = await (await getPreferences()).keys();
      return keys.includes(resolveKey(key));
    },
    async getItem(key) {
      return (await (await getPreferences()).get({ key: resolveKey(key) })).value;
    },
    async getItemRaw(key) {
      return (await (await getPreferences()).get({ key: resolveKey(key) })).value;
    },
    async setItem(key, value) {
      return (await getPreferences()).set({ key: resolveKey(key), value });
    },
    async setItemRaw(key, value) {
      return (await getPreferences()).set({ key: resolveKey(key), value });
    },
    async removeItem(key) {
      return (await getPreferences()).remove({ key: resolveKey(key) });
    },
    async getKeys() {
      const { keys } = await (await getPreferences()).keys();
      return keys.map((key) => key.slice(base.length));
    },
    async clear(prefix) {
      const preferences = await getPreferences();
      const { keys } = await preferences.keys();
      const _prefix = resolveKey(prefix || "");
      await Promise.all(
        keys.filter((key) => key.startsWith(_prefix)).map((key) => preferences.remove({ key })),
      );
    },
  };
};

export default driver;
