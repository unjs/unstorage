import { defineDriver } from "./utils";
import { LRUCache } from "lru-cache";

type LRUCacheOptions = LRUCache.OptionsBase<string, any, any> &
  Partial<LRUCache.OptionsMaxLimit<string, any, any>> &
  Partial<LRUCache.OptionsSizeLimit<string, any, any>> &
  Partial<LRUCache.OptionsTTLLimit<string, any, any>>;

export interface LRUDriverOptions extends LRUCacheOptions {}

const DRIVER_NAME = "lru-cache";

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
    hasItem(key) {
      return cache.has(key);
    },
    getItem(key) {
      return cache.get(key) ?? null;
    },
    getItemRaw(key) {
      return cache.get(key) ?? null;
    },
    setItem(key, value) {
      cache.set(key, value);
    },
    setItemRaw(key, value) {
      cache.set(key, value);
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
