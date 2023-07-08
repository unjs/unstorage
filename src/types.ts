import { CloudflareKvBindingSetItemOptions } from "./drivers/cloudflare-kv-binding";
import { CloudflareKvHttpSetItemOptions } from "./drivers/cloudflare-kv-http";

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

export type TransactionOptions =
  | ({
      cloudflareKvBinding?: CloudflareKvBindingSetItemOptions;
      cloudflareKvHttp?: CloudflareKvHttpSetItemOptions;
      ttl?: number;
    } & Record<string, any>)
  | undefined;

export interface Driver {
  name?: string;
  options?: any;
  hasItem: (key: string, opts: TransactionOptions) => MaybePromise<boolean>;
  getItem: (
    key: string,
    opts?: TransactionOptions
  ) => MaybePromise<StorageValue>;
  /** @experimental */
  getItems?: (
    items: { key: string; options?: TransactionOptions }[],
    commonOptions?: TransactionOptions
  ) => MaybePromise<{ key: string; value: StorageValue }[]>;
  /** @experimental */
  getItemRaw?: (key: string, opts: TransactionOptions) => MaybePromise<unknown>;
  setItem?: (
    key: string,
    value: string,
    opts: TransactionOptions
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
    opts: TransactionOptions
  ) => MaybePromise<void>;
  removeItem?: (key: string, opts: TransactionOptions) => MaybePromise<void>;
  getMeta?: (
    key: string,
    opts: TransactionOptions
  ) => MaybePromise<StorageMeta | null>;
  getKeys: (base: string, opts: TransactionOptions) => MaybePromise<string[]>;
  clear?: (base: string, opts: TransactionOptions) => MaybePromise<void>;
  dispose?: () => MaybePromise<void>;
  watch?: (callback: WatchCallback) => MaybePromise<Unwatch>;
}

export interface Storage<T extends StorageValue = StorageValue> {
  // Item
  hasItem: (key: string, opts?: TransactionOptions) => Promise<boolean>;
  getItem: <U extends T>(
    key: string,
    opts?: TransactionOptions
  ) => Promise<U | null>;
  /** @experimental */
  getItems: (
    items: (string | { key: string; options?: TransactionOptions })[],
    commonOptions?: TransactionOptions
  ) => Promise<{ key: string; value: StorageValue }[]>;
  /** @experimental See https://github.com/unjs/unstorage/issues/142 */
  getItemRaw: <T = any>(
    key: string,
    opts?: TransactionOptions
  ) => Promise<MaybeDefined<T> | null>;
  setItem: <U extends T>(
    key: string,
    value: U,
    opts?: TransactionOptions
  ) => Promise<void>;
  /** @experimental */
  setItems: (
    items: { key: string; value: string; options?: TransactionOptions }[],
    commonOptions?: TransactionOptions
  ) => Promise<void>;
  /** @experimental See https://github.com/unjs/unstorage/issues/142 */
  setItemRaw: <T = any>(
    key: string,
    value: MaybeDefined<T>,
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
}
