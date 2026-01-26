export type StorageValue = null | string | number | boolean | object;
export type WatchEvent = "update" | "remove";
export type WatchCallback = (event: WatchEvent, key: string) => any;

type MaybePromise<T> = T | Promise<T>;

export type Unwatch = () => MaybePromise<void>;

export interface StorageMeta {
  atime?: Date;
  mtime?: Date;
  [key: string]: StorageValue | Date | undefined;
}

type TransactionOptions = Record<string, any>;

export interface Driver {
  name?: string;
  options?: any;
  hasItem: (key: string, opts?: TransactionOptions) => MaybePromise<boolean>;
  getItem: (
    key: string,
    opts?: TransactionOptions
  ) => MaybePromise<StorageValue>;
  /** @experimental */
  getItemRaw?: (
    key: string,
    opts?: TransactionOptions
  ) => MaybePromise<unknown>;
  setItem?: (
    key: string,
    value: string,
    opts?: TransactionOptions
  ) => MaybePromise<void>;
  /** @experimental */
  setItemRaw?: (
    key: string,
    value: any,
    opts?: TransactionOptions
  ) => MaybePromise<void>;
  removeItem?: (key: string, opts?: TransactionOptions) => MaybePromise<void>;
  getMeta?: (
    key: string,
    opts?: TransactionOptions
  ) => MaybePromise<StorageMeta>;
  getKeys: (base?: string, opts?: TransactionOptions) => MaybePromise<string[]>;
  clear?: (base?: string, opts?: TransactionOptions) => MaybePromise<void>;
  dispose?: () => MaybePromise<void>;
  watch?: (callback: WatchCallback) => MaybePromise<Unwatch>;
  client?: any;
}

export interface Storage {
  // Item
  hasItem: (key: string, opts?: TransactionOptions) => Promise<boolean>;
  getItem: (key: string, opts?: TransactionOptions) => Promise<StorageValue>;
  /** @experimental See https://github.com/unjs/unstorage/issues/142 */
  getItemRaw: (key: string, opts?: TransactionOptions) => Promise<any>;
  setItem: (
    key: string,
    value: StorageValue,
    opts?: TransactionOptions
  ) => Promise<void>;
  /** @experimental See https://github.com/unjs/unstorage/issues/142 */
  setItemRaw: (
    key: string,
    value: any,
    opts?: TransactionOptions
  ) => Promise<void>;
  removeItem: (
    key: string,
    opts?:
      | (TransactionOptions & { removeMata?: boolean })
      | boolean /* legacy: removeMata */
  ) => Promise<void>;
  // Meta
  getMeta: (
    key: string,
    opts?:
      | (TransactionOptions & { nativeOnly?: boolean })
      | boolean /* legacy: nativeOnly */
  ) => MaybePromise<StorageMeta>;
  setMeta: (
    key: string,
    value: StorageMeta,
    opts?: TransactionOptions
  ) => Promise<void>;
  removeMeta: (key: string, opts?: TransactionOptions) => Promise<void>;
  // Keys
  getKeys: (base?: string, opts?: TransactionOptions) => Promise<string[]>;
  // Utils
  clear: (base?: string, opts?: TransactionOptions) => Promise<void>;
  dispose: () => Promise<void>;
  watch: (callback: WatchCallback) => Promise<Unwatch>;
  unwatch: () => Promise<void>;
  // Mount
  mount: (base: string, driver: Driver) => Storage;
  unmount: (base: string, dispose?: boolean) => Promise<void>;
  getMount: (key?: string) => { base: string; driver: Driver };
  getMounts: (
    base?: string,
    options?: { parents?: boolean }
  ) => { base: string; driver: Driver }[];
  client?: any;
}
