import { defineDriver } from "./utils";
import LRU, { SharedOptions as _LRUOptions } from "lru-cache";

type LRUOptions = _LRUOptions<string, any>;
export interface LRUDriverOptions extends LRUOptions {}

export default defineDriver((opts: LRUDriverOptions) => {
  const cache = new LRU({
    ...opts,
    max: 500,
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
