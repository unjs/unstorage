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

export interface Driver {
  hasItem: (key: string) => MaybePromise<boolean>;
  getItem: (key: string) => MaybePromise<StorageValue>;
  /** @experimental */
  getItemRaw?: (key: string) => MaybePromise<unknown>;
  setItem?: (key: string, value: string) => MaybePromise<void>;
  /** @experimental */
  setKeyExpire?: (key: string, seconds: number) => MaybePromise<void>;
  setItemRaw?: (key: string, value: any) => MaybePromise<void>;
  removeItem?: (key: string) => MaybePromise<void>;
  getMeta?: (key: string) => MaybePromise<StorageMeta>;
  getKeys: (base?: string) => MaybePromise<string[]>;
  clear?: () => MaybePromise<void>;
  dispose?: () => MaybePromise<void>;
  watch?: (callback: WatchCallback) => MaybePromise<Unwatch>;
}

export interface Storage {
  // Item
  hasItem: (key: string) => Promise<boolean>;
  getItem: (key: string) => Promise<StorageValue>;
  /** @experimental See https://github.com/unjs/unstorage/issues/142 */
  getItemRaw: (key: string) => Promise<any>;
  setItem: (key: string, value: StorageValue) => Promise<void>;
  /** @experimental See https://github.com/unjs/unstorage/issues/142 */
  setKeyExpire: (key: string, seconds: number) => Promise<void>;
  setItemRaw: (key: string, value: any) => Promise<void>;
  removeItem: (key: string, removeMeta?: boolean) => Promise<void>;
  // Meta
  getMeta: (key: string, nativeMetaOnly?: true) => MaybePromise<StorageMeta>;
  setMeta: (key: string, value: StorageMeta) => Promise<void>;
  removeMeta: (key: string) => Promise<void>;
  // Keys
  getKeys: (base?: string) => Promise<string[]>;
  // Utils
  clear: (base?: string) => Promise<void>;
  dispose: () => Promise<void>;
  watch: (callback: WatchCallback) => Promise<Unwatch>;
  unwatch: () => Promise<void>;
  // Mount
  mount: (base: string, driver: Driver) => Storage;
  unmount: (base: string, dispose?: boolean) => Promise<void>;
}
