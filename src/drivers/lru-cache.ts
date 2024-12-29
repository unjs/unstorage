import { defineDriver } from "./utils";
import { LRUCache } from "lru-cache";
import { type TransactionOptions, type StorageValue } from "../types";

type LRUCacheOptions = LRUCache.OptionsBase<string, any, any> &
  Partial<LRUCache.OptionsMaxLimit<string, any, any>> &
  Partial<LRUCache.OptionsSizeLimit<string, any, any>> &
  Partial<LRUCache.OptionsTTLLimit<string, any, any>>;

export interface LRUDriverOptions extends LRUCacheOptions {}

const DRIVER_NAME = "lru-cache";

export type HasItemOptions = LRUCache.HasOptions<string, any, any> &
  TransactionOptions;
export type GetItemOptions = LRUCache.GetOptions<string, any, any> &
  TransactionOptions;
export type SetItemOptions = LRUCache.SetOptions<string, any, any> &
  TransactionOptions;

export default defineDriver((opts: LRUDriverOptions = {}) => {
  const cache = new LRUCache({
    max: 1000,
    sizeCalculation:
      opts.maxSize || opts.maxEntrySize
        ? (value, key: string) => {
            return key.length + byteLength(value);
          }
        : undefined,
    ...opts,
  });

  return {
    name: DRIVER_NAME,
    options: opts,
    getInstance: () => cache,
    hasItem(key, opts?: HasItemOptions) {
      return cache.has(key, opts);
    },
    // Note: its important we specify the return types here, since
    // otherwise we will end up adding an overload of `getItem` which
    // returns `any`
    getItem(key, opts?: GetItemOptions): StorageValue {
      return cache.get(key, opts) ?? null;
    },
    getItemRaw(key, opts?: GetItemOptions): StorageValue {
      return cache.get(key, opts) ?? null;
    },
    setItem(key, value, opts?: SetItemOptions) {
      cache.set(key, value, opts);
    },
    setItemRaw(key, value, opts?: SetItemOptions) {
      cache.set(key, value, opts);
    },
    removeItem(key) {
      cache.delete(key);
    },
    getKeys() {
      return [...cache.keys()];
    },
    clear() {
      cache.clear();
    },
    dispose() {
      cache.clear();
    },
  };
});

function byteLength(value: any) {
  if (typeof Buffer !== "undefined") {
    try {
      return Buffer.byteLength(value);
    } catch {
      // ignore
    }
  }
  try {
    return typeof value === "string"
      ? value.length
      : JSON.stringify(value).length;
  } catch {
    // ignore
  }
  return 0;
}
