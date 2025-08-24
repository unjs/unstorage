import type {
  DriverGetOptions,
  DriverListOptions,
  DriverRemoveOptions,
  DriverSetOptions,
} from "./_drivers";

export type StorageValue = null | string | number | boolean | object;
export type WatchEvent = "update" | "remove";
export type WatchCallback = (event: WatchEvent, key: string) => any;

type MaybePromise<T> = T | Promise<T>;

type MaybeDefined<T> = T extends any ? T : any;

export type Unwatch = () => MaybePromise<void>;

export interface StorageMeta {
  atime?: Date;
  mtime?: Date;
  ttl?: number;
  [key: string]: StorageValue | Date | undefined;
}

export type TransactionOptions = Record<string, any>;

export interface CommonGetOptions {}

export interface CommonSetOptions {
  /**
   * Time to live in seconds.
   */
  ttl?: number;
}

export interface CommonRemoveOptions {
  removeMeta?: boolean;
}

export interface CommonListOptions {}

export type InferOperationOptions<
  TDriver,
  TName extends string,
> = TDriver extends {
  getOptions?: infer TGet;
  setOptions?: infer TSet;
  removeOptions?: infer TRemove;
  listOptions?: infer TList;
}
  ? {
      getOptions?: {
        [N in TName]?: unknown extends TGet ? {} : TGet;
      } & CommonGetOptions &
        TransactionOptions;
      setOptions?: {
        [N in TName]?: unknown extends TSet ? {} : TSet;
      } & CommonSetOptions &
        TransactionOptions;
      removeOptions?: {
        [N in TName]?: unknown extends TRemove ? {} : TRemove;
      } & CommonRemoveOptions &
        TransactionOptions;
      listOptions?: {
        [N in TName]?: unknown extends TList ? {} : TList;
      } & CommonListOptions &
        TransactionOptions;
    }
  : never;

export type GetOptions = DriverGetOptions;
export type SetOptions = DriverSetOptions;
export type RemoveOptions = DriverRemoveOptions &
  CommonRemoveOptions &
  TransactionOptions;
export type ListOptions = DriverListOptions &
  CommonListOptions &
  TransactionOptions;

export type GetKeysOptions = TransactionOptions & {
  maxDepth?: number;
};

export interface DriverFlags {
  maxDepth?: boolean;
  ttl?: boolean;
}

export interface Driver<OptionsT = any, InstanceT = any> {
  name?: string;
  flags?: DriverFlags;
  options?: OptionsT;
  getInstance?: () => InstanceT;
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
  getKeys: (base: string, opts: GetKeysOptions) => MaybePromise<string[]>;
  clear?: (base: string, opts: TransactionOptions) => MaybePromise<void>;
  dispose?: () => MaybePromise<void>;
  watch?: (callback: WatchCallback) => MaybePromise<Unwatch>;
}

type StorageDefinition = {
  items: unknown;
  [key: string]: unknown;
};

type StorageItemMap<T> = T extends StorageDefinition ? T["items"] : T;
type StorageItemType<T, K> = K extends keyof StorageItemMap<T>
  ? StorageItemMap<T>[K]
  : T extends StorageDefinition
    ? StorageValue
    : T;

export interface Storage<T extends StorageValue = StorageValue> {
  // Item
  hasItem<
    U extends Extract<T, StorageDefinition>,
    K extends keyof StorageItemMap<U>,
  >(
    key: K,
    opts?: TransactionOptions
  ): Promise<boolean>;
  hasItem(key: string, opts?: TransactionOptions): Promise<boolean>;

  getItem<
    U extends Extract<T, StorageDefinition>,
    K extends string & keyof StorageItemMap<U>,
  >(
    key: K,
    ops?: GetOptions
  ): Promise<StorageItemType<T, K> | null>;
  getItem<R = StorageItemType<T, string>>(
    key: string,
    opts?: GetOptions
  ): Promise<R | null>;

  /** @experimental */
  getItems: <U extends T>(
    items: (string | { key: string; options?: GetOptions })[],
    commonOptions?: GetOptions
  ) => Promise<{ key: string; value: U }[]>;
  /** @experimental See https://github.com/unjs/unstorage/issues/142 */
  getItemRaw: <T = any>(
    key: string,
    opts?: GetOptions
  ) => Promise<MaybeDefined<T> | null>;

  setItem<
    U extends Extract<T, StorageDefinition>,
    K extends keyof StorageItemMap<U>,
  >(
    key: K,
    value: StorageItemType<T, K>,
    opts?: SetOptions
  ): Promise<void>;
  setItem<U extends T>(key: string, value: U, opts?: SetOptions): Promise<void>;

  /** @experimental */
  setItems: <U extends T>(
    items: { key: string; value: U; options?: SetOptions }[],
    commonOptions?: SetOptions
  ) => Promise<void>;
  /** @experimental See https://github.com/unjs/unstorage/issues/142 */
  setItemRaw: <T = any>(
    key: string,
    value: MaybeDefined<T>,
    opts?: SetOptions
  ) => Promise<void>;

  removeItem<
    U extends Extract<T, StorageDefinition>,
    K extends keyof StorageItemMap<U>,
  >(
    key: K,
    opts?: RemoveOptions | boolean /* legacy: removeMeta */
  ): Promise<void>;
  removeItem(
    key: string,
    opts?: RemoveOptions | boolean /* legacy: removeMeta */
  ): Promise<void>;

  // Meta
  getMeta: (
    key: string,
    opts?:
      | (GetOptions & { nativeOnly?: boolean })
      | boolean /* legacy: nativeOnly */
  ) => MaybePromise<StorageMeta>;
  setMeta: (
    key: string,
    value: StorageMeta,
    opts?: SetOptions
  ) => Promise<void>;
  removeMeta: (key: string, opts?: RemoveOptions) => Promise<void>;
  // Keys
  getKeys: (base?: string, opts?: GetKeysOptions) => Promise<string[]>;
  // Utils

  // TODO: what options should it have?
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
  // Aliases
  keys: Storage["getKeys"];
  get: Storage<T>["getItem"];
  set: Storage<T>["setItem"];
  has: Storage<T>["hasItem"];
  del: Storage<T>["removeItem"];
  remove: Storage<T>["removeItem"];
}
