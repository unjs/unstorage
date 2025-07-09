import { defineDriver, normalizeKey } from "./utils";
import {
  get,
  set,
  clear,
  del,
  keys,
  createStore,
  type UseStore,
} from "idb-keyval";

export interface IDBKeyvalOptions {
  base?: string;
  dbName?: string;
  storeName?: string;
}

const DRIVER_NAME = "idb-keyval";

export default defineDriver((opts: IDBKeyvalOptions = {}) => {
  const base = opts.base && opts.base.length > 0 ? `${opts.base}:` : "";
  const makeKey = (key: string) => base + key;

  let customStore: UseStore | undefined;
  if (opts.dbName && opts.storeName) {
    customStore = createStore(opts.dbName, opts.storeName);
  }

  return {
    name: DRIVER_NAME,
    options: opts,
    async hasItem(key) {
      const item = await get(makeKey(key), customStore);
      return item === undefined ? false : true;
    },
    async getItem(key) {
      const item = await get(makeKey(key), customStore);
      return item ?? null;
    },
    async getItemRaw(key) {
      const item = await get(makeKey(key), customStore);
      return item ?? null;
    },
    setItem(key, value) {
      return set(makeKey(key), value, customStore);
    },
    setItemRaw(key, value) {
      return set(makeKey(key), value, customStore);
    },
    removeItem(key) {
      return del(makeKey(key), customStore);
    },
    async getKeys() {
      const _keys: string[] = await keys(customStore);
      return _keys.map((key) => key.replace(base, ""));
    },
    async clear(prefix) {
      const _base = [base, prefix].filter(Boolean).join("");
      if (_base) {
        const _keys: string[] = await keys(customStore);
        for (const key of _keys) {
          console.log(key, _base);
          if (key.startsWith(_base) && key !== normalizeKey(_base)) {
            del(key, customStore);
          }
        }
      } else {
        await clear(customStore);
      }
    },
  };
});
