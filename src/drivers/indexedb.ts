import { defineDriver } from "./utils/index.ts";
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
    getKeys() {
      return keys(customStore);
    },
    clear() {
      return clear(customStore);
    },
  };
});
