import { defineDriver } from "./utils";
import LRU from "lru-cache";

type LRUCacheOptions = LRU.SharedOptions<string, any> &
  // LRU.SafetyBounds
  LRU.LimitedByCount &
  LRU.LimitedBySize<string, any> &
  LRU.LimitedByTTL & {
    /**
     * The maximum allowed size for any single item in the cache.
     *
     * If a larger item is passed to set or returned by a
     * fetchMethod, then it will not be stored in the cache.
     */
    maxEntrySize?: number; // LRU.LRUSize
    sizeCalculation?: LRU.SizeCalculator<string, any>;
  };

export interface LRUDriverOptions extends Partial<LRUCacheOptions> {}

export default defineDriver((opts: LRUDriverOptions = {}) => {
  const cache = new LRU({
    max: 1000,
    sizeCalculation:
      opts.maxSize || opts.maxEntrySize
        ? (value, key) => {
            return key.length + byteLength(value);
          }
        : undefined,
    ...opts,
  });

  return {
    hasItem(key) {
      return cache.has(key);
    },
    getItem(key) {
      return cache.get(key) || null;
    },
    getItemRaw(key) {
      return cache.get(key) || null;
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
