import { Preferences } from "@capacitor/preferences";

import { defineDriver, joinKeys, normalizeKey } from "./utils";

const DRIVER_NAME = "capacitor-preferences";

export interface CapacitorPreferencesOptions {
  base?: string;
}

export default defineDriver<CapacitorPreferencesOptions>((opts) => {
  const base = normalizeKey(opts?.base);
  const r = (key: string) => joinKeys(base, key);

  return {
    name: DRIVER_NAME,
    options: opts,
    hasItem(key) {
      return Preferences.keys().then(({ keys }) => keys.includes(r(key)));
    },
    getItem(key) {
      return Preferences.get({ key: r(key) }).then(({ value }) => value);
    },
    getItemRaw(key) {
      return Preferences.get({ key: r(key) }).then(({ value }) => value);
    },
    setItem(key, value) {
      return Preferences.set({ key: r(key), value });
    },
    setItemRaw(key, value) {
      return Preferences.set({ key: r(key), value });
    },
    removeItem(key) {
      return Preferences.remove({ key: r(key) });
    },
    getKeys(base) {
      if (!base) return Preferences.keys().then(({ keys }) => keys);

      const filteredKeys = Preferences.keys().then(({ keys }) =>
        keys.filter((key) => key.startsWith(base))
      );

      const optionBase = opts?.base;
      if (!optionBase) return filteredKeys;

      return filteredKeys.then((keys) =>
        keys.map((key) => key.slice(optionBase.length))
      );
    },
    clear() {
      return Preferences.clear();
    },
  };
});
