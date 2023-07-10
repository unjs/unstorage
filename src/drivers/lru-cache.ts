import { defineDriver } from "./utils";
import { LRUCache } from "lru-cache";

type LRUCacheOptions = LRUCache.OptionsBase<string, any, any> &
  Partial<LRUCache.OptionsMaxLimit<string, any, any>> &
  Partial<LRUCache.OptionsSizeLimit<string, any, any>> &
  Partial<LRUCache.OptionsTTLLimit<string, any, any>>;

export interface LRUDriverOptions extends LRUCacheOptions {}

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
    name: "lru-cache",
    options: opts,
    hasItem(key) {
      return cache.has(key);
    },
    getItem(key) {
      return cache.get(key);
    },
    getItemRaw(key) {
      return cache.get(key);
    },
    setItem(key, value,setItemOptions) {
      cache.set(key, value, setItemOptions);
    },
    setItemRaw(key, value) {
      cache.set(key, value);
    },
    removeItem(key) {
      cache.delete(key);
    },
    getKeys() {
      return Array.from(cache.keys());
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
  if (typeof Buffer !== undefined) {
    try {
      return Buffer.byteLength(value);
    } catch {}
  }
  try {
    return typeof value === "string"
      ? value.length
      : JSON.stringify(value).length;
  } catch {}
  return 0;
}
