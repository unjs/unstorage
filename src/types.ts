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

export interface DriverFlags {
  maxDepth?: boolean;
  ttl?: boolean;
}

export type DriverMethodOptionsMap<
  GetOptionsT = TransactionOptions,
  SetOptionsT = TransactionOptions,
  HasOptionsT = TransactionOptions,
  RemoveOptionsT = TransactionOptions,
  GetKeysOptionsT = TransactionOptions,
> = {
  getOptions?: GetOptionsT ;
  setOptions?: SetOptionsT ;
  hasOptions?: HasOptionsT ;
  removeOptions?: RemoveOptionsT ;
  getKeysOptions?: GetKeysOptionsT ;
};

export interface Driver<
  OptionsT = any,
  InstanceT = any,
  DriverMethodOptionsMapT extends DriverMethodOptionsMap = DriverMethodOptionsMap,
> {
  name?: string;
  flags?: DriverFlags;
  options?: OptionsT;
  getInstance?: () => InstanceT;
  hasItem: (key: string, opts: DriverMethodOptionsMapT["hasOptions"]) => MaybePromise<boolean>;
  getItem: (
    key: string,
    opts?: DriverMethodOptionsMapT["getOptions"]
  ) => MaybePromise<StorageValue>;
  /** @experimental */
  getItems?: (
    items: { key: string; options?: DriverMethodOptionsMapT["getOptions"] }[],
    commonOptions?: DriverMethodOptionsMapT["getOptions"]
  ) => MaybePromise<{ key: string; value: StorageValue }[]>;
  /** @experimental */
  getItemRaw?: (
    key: string,
    opts: DriverMethodOptionsMapT["getOptions"]
  ) => MaybePromise<unknown>;
  setItem?: (
    key: string,
    value: string,
    opts: DriverMethodOptionsMapT["setOptions"]
  ) => MaybePromise<void>;
  /** @experimental */
  setItems?: (
    items: { key: string; value: string; options?: DriverMethodOptionsMapT["setOptions"] }[],
    commonOptions?: DriverMethodOptionsMapT["setOptions"]
  ) => MaybePromise<void>;
  /** @experimental */
  setItemRaw?: (
    key: string,
    value: any,
    opts: DriverMethodOptionsMapT["setOptions"]
  ) => MaybePromise<void>;
  removeItem?: (
    key: string,
    opts: DriverMethodOptionsMapT["removeOptions"]
  ) => MaybePromise<void>;
  getMeta?: (
    key: string,
    opts: DriverMethodOptionsMapT["getOptions"]
  ) => MaybePromise<StorageMeta | null>;
  getKeys: (
    base: string,
    opts: DriverMethodOptionsMapT["getKeysOptions"]
  ) => MaybePromise<string[]>;
  clear?: (base: string, opts: DriverMethodOptionsMapT["removeOptions"]) => MaybePromise<void>;
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

type StorageMethodOptions<DriverT extends Driver> =
  DriverT extends Driver<any, any, infer MethodOptionsT>
    ? MethodOptionsT
    : never;

// if options type is not set it is unknown and we default back to TransactionOptions
type SetOptionsType<DriverT extends Driver> =
  unknown extends StorageMethodOptions<DriverT>["setOptions"]
    ? TransactionOptions
    : StorageMethodOptions<DriverT>["setOptions"] | undefined;
type GetOptionsType<DriverT extends Driver> =
  unknown extends StorageMethodOptions<DriverT>["getOptions"]
    ? TransactionOptions
    : StorageMethodOptions<DriverT>["getOptions"];
type RemoveOptionsType<DriverT extends Driver> =
  unknown extends StorageMethodOptions<DriverT>["removeOptions"]
    ? TransactionOptions
    : StorageMethodOptions<DriverT>["removeOptions"];
type GetKeysOptionsType<DriverT extends Driver> =
  unknown extends StorageMethodOptions<DriverT>["getKeysOptions"]
    ? TransactionOptions
    : StorageMethodOptions<DriverT>["getKeysOptions"];
type HasOptionsType<DriverT extends Driver> =
  unknown extends StorageMethodOptions<DriverT>["hasOptions"]
    ? TransactionOptions
    : StorageMethodOptions<DriverT>["hasOptions"];

export interface Storage<
  T extends StorageValue = StorageValue,
  DriverT extends Driver = Driver,
> {
  // Item
  hasItem<
    U extends Extract<T, StorageDefinition>,
    K extends keyof StorageItemMap<U>,
  >(
    key: K,
    opts?: HasOptionsType<DriverT>
  ): Promise<boolean>;
  hasItem(key: string, opts?: HasOptionsType<DriverT>): Promise<boolean>;

  getItem<
    U extends Extract<T, StorageDefinition>,
    K extends string & keyof StorageItemMap<U>,
  >(
    key: K,
    opts?: GetOptionsType<DriverT>
  ): Promise<StorageItemType<T, K> | null>;
  getItem<R = StorageItemType<T, string>>(
    key: string,
    opts?: GetOptionsType<DriverT>
  ): Promise<R | null>;

  /** @experimental */
  getItems: <U extends T>(
    items: (string | { key: string; options?: GetOptionsType<DriverT> })[],
    commonOptions?: GetOptionsType<DriverT>
  ) => Promise<{ key: string; value: U }[]>;
  /** @experimental See https://github.com/unjs/unstorage/issues/142 */
  getItemRaw: <T = any>(
    key: string,
    opts?: GetOptionsType<DriverT>
  ) => Promise<MaybeDefined<T> | null>;

  setItem<
    U extends Extract<T, StorageDefinition>,
    K extends keyof StorageItemMap<U>,
  >(
    key: K,
    value: StorageItemType<T, K>,
    opts?: SetOptionsType<DriverT>
  ): Promise<void>;
  setItem<U extends T>(
    key: string,
    value: U,
    opts?: SetOptionsType<DriverT>
  ): Promise<void>;

  /** @experimental */
  setItems: <U extends T>(
    items: { key: string; value: U; options?: SetOptionsType<DriverT> }[],
    commonOptions?: SetOptionsType<DriverT>
  ) => Promise<void>;
  /** @experimental See https://github.com/unjs/unstorage/issues/142 */
  setItemRaw: <T = any>(
    key: string,
    value: MaybeDefined<T>,
    opts?: SetOptionsType<DriverT>
  ) => Promise<void>;

  removeItem<
    U extends Extract<T, StorageDefinition>,
    K extends keyof StorageItemMap<U>,
  >(
    key: K,
    opts?:
      | (RemoveOptionsType<DriverT> & { removeMeta?: boolean })
      | boolean /* legacy: removeMeta */
  ): Promise<void>;
  removeItem(
    key: string,
    opts?:
      | (RemoveOptionsType<DriverT> & { removeMeta?: boolean })
      | boolean /* legacy: removeMeta */
  ): Promise<void>;

  // Meta
  getMeta: (
    key: string,
    opts?:
      | (GetOptionsType<DriverT> & { nativeOnly?: boolean })
      | boolean /* legacy: nativeOnly */
  ) => MaybePromise<StorageMeta>;
  setMeta: (
    key: string,
    value: StorageMeta,
    opts?: SetOptionsType<DriverT>
  ) => Promise<void>;
  removeMeta: (key: string, opts?: RemoveOptionsType<DriverT>) => Promise<void>;
  // Keys
  getKeys: (
    base?: string,
    opts?: GetKeysOptionsType<DriverT>
  ) => Promise<string[]>;
  // Utils
  clear: (base?: string, opts?: RemoveOptionsType<DriverT>) => Promise<void>;
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
  get: Storage<T, DriverT>["getItem"];
  set: Storage<T, DriverT>["setItem"];
  has: Storage<T, DriverT>["hasItem"];
  del: Storage<T, DriverT>["removeItem"];
  remove: Storage<T, DriverT>["removeItem"];
}
