import {
  type DriverFactory,
  importLib,
  type LibImport,
  type DriverDependencies,
} from "./utils/index.ts";
import type { UseStore } from "idb-keyval";

export interface IDBKeyvalOptions {
  base?: string;
  dbName?: string;
  storeName?: string;

  /**
   * Optionally provide the [`idb-keyval`](https://www.npmjs.com/package/idb-keyval) library
   * to avoid dynamically importing it.
   */
  lib?: LibImport<typeof import("idb-keyval")>;
}

export const DRIVER_DEPENDENCIES: DriverDependencies = {
  lib: { name: "idb-keyval", version: "^6.2.2" },
};

const DRIVER_NAME = "idb-keyval";

const driver: DriverFactory<IDBKeyvalOptions> = (opts = {}) => {
  const base = opts.base && opts.base.length > 0 ? `${opts.base}:` : "";
  const makeKey = (key: string) => base + key;

  let _lib: Promise<{ lib: typeof import("idb-keyval"); store: UseStore | undefined }> | undefined;
  const getLib = () =>
    (_lib ??= importLib(DRIVER_NAME, "idb-keyval", opts.lib, () => import("idb-keyval")).then(
      (lib) => ({
        lib,
        store:
          opts.dbName && opts.storeName ? lib.createStore(opts.dbName, opts.storeName) : undefined,
      }),
    ));

  return {
    name: DRIVER_NAME,
    options: opts,
    async hasItem(key) {
      const { lib, store } = await getLib();
      const item = await lib.get(makeKey(key), store);
      return item === undefined ? false : true;
    },
    async getItem(key) {
      const { lib, store } = await getLib();
      const item = await lib.get(makeKey(key), store);
      return item ?? null;
    },
    async getItemRaw(key) {
      const { lib, store } = await getLib();
      const item = await lib.get(makeKey(key), store);
      return item ?? null;
    },
    async setItem(key, value) {
      const { lib, store } = await getLib();
      return lib.set(makeKey(key), value, store);
    },
    async setItemRaw(key, value) {
      const { lib, store } = await getLib();
      return lib.set(makeKey(key), value, store);
    },
    async removeItem(key) {
      const { lib, store } = await getLib();
      return lib.del(makeKey(key), store);
    },
    async getKeys() {
      const { lib, store } = await getLib();
      return lib.keys(store);
    },
    async clear() {
      const { lib, store } = await getLib();
      return lib.clear(store);
    },
  };
};

export default driver;
