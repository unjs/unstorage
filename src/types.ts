export type StorageValue = null | string | number | boolean | object;
export type WatchEvent = "update" | "remove";
export type WatchCallback = (event: WatchEvent, key: string) => any;

type MaybePromise<T> = T | Promise<T>;

type MaybeDefined<T> = T extends any ? T : any;

export type Unwatch = () => MaybePromise<void>;

export interface StorageMeta {
  atime?: Date;
  mtime?: Date;
  [key: string]: StorageValue | Date | undefined;
}

export type TransactionOptions = Record<string, any>;

export interface Driver {
  name?: string;
  options?: any;
  hasItem: (key: string, options?: TransactionOptions) => MaybePromise<boolean>;
  getItem: (
    key: string,
    options?: TransactionOptions
  ) => MaybePromise<StorageValue>;
  /** @experimental */
  getItems?: (
    items: { key: string; options?: TransactionOptions }[],
    commonOptions?: TransactionOptions
  ) => MaybePromise<{ key: string; value: StorageValue }[]>;
  getItemRaw?: (
    key: string,
    options?: TransactionOptions
  ) => MaybePromise<unknown>;
  setItem?: (
    key: string,
    value: string,
    options?: TransactionOptions
  ) => MaybePromise<void>;
  /** @experimental */
  setItems?: (
    items: { key: string; value: string; options?: TransactionOptions }[],
    commonOptions?: TransactionOptions
  ) => MaybePromise<void>;
  /** @experimental */
  setItemRaw?: (
    key: string,
    value: any,
    options?: TransactionOptions
  ) => MaybePromise<void>;
  removeItem?: (
    key: string,
    options?: TransactionOptions
  ) => MaybePromise<void>;
  getMeta?: (
    key: string,
    options?: TransactionOptions
  ) => MaybePromise<StorageMeta>;
  getKeys: (
    base?: string,
    options?: TransactionOptions
  ) => MaybePromise<string[]>;
  clear?: (base?: string, options?: TransactionOptions) => MaybePromise<void>;
  dispose?: () => MaybePromise<void>;
  watch?: (callback: WatchCallback) => MaybePromise<Unwatch>;
}

export interface Storage<T extends StorageValue = StorageValue> {
  // Item
  hasItem: (key: string, options?: TransactionOptions) => Promise<boolean>;
  getItem: (key: string, options?: TransactionOptions) => Promise<StorageValue>;
  /** @experimental */
  getItems: (
    items: (string | { key: string; options?: TransactionOptions })[],
    commonOptions?: TransactionOptions
  ) => MaybePromise<{ key: string; value: StorageValue }[]>;
  /** @experimental See https://github.com/unjs/unstorage/issues/142 */
  getItemRaw: (key: string, options?: TransactionOptions) => Promise<any>;
  setItem: (
    key: string,
    value: StorageValue,
    options?: TransactionOptions
  ) => Promise<void>;
  /** @experimental */
  setItems: (
    items: { key: string; value: string; options?: TransactionOptions }[],
    commonOptions?: TransactionOptions
  ) => MaybePromise<void>;
  /** @experimental See https://github.com/unjs/unstorage/issues/142 */
  setItemRaw: <T = any>(
    key: string,
    value: any,
    options?: TransactionOptions
  ) => Promise<void>;
  removeItem: (
    key: string,
    options?:
      | (TransactionOptions & { removeMata?: boolean })
      | boolean /* legacy: removeMata */
  ) => Promise<void>;
  // Meta
  getMeta: (
    key: string,
    options?:
      | (TransactionOptions & { nativeOnly?: boolean })
      | boolean /* legacy: nativeOnly */
  ) => MaybePromise<StorageMeta>;
  setMeta: (
    key: string,
    value: StorageMeta,
    options?: TransactionOptions
  ) => Promise<void>;
  removeMeta: (key: string, options?: TransactionOptions) => Promise<void>;
  // Keys
  getKeys: (base?: string, options?: TransactionOptions) => Promise<string[]>;
  // Utils
  clear: (base?: string, options?: TransactionOptions) => Promise<void>;
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
}
