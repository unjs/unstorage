import { type DriverFactory } from "./utils/index.ts";
import { LRUCache } from "lru-cache";
import { checkCAS } from "./utils/cas.ts";

type LRUCacheOptions = LRUCache.OptionsBase<string, any, any> &
  Partial<LRUCache.OptionsMaxLimit<string, any, any>> &
  Partial<LRUCache.OptionsSizeLimit<string, any, any>> &
  Partial<LRUCache.OptionsTTLLimit<string, any, any>>;

export interface LRUDriverOptions extends LRUCacheOptions {}

const DRIVER_NAME = "lru-cache";

const driver: DriverFactory<LRUDriverOptions, LRUCache<string, any, any>> = (opts = {}) => {
  const etags = new Map<string, string>();
  let counter = 0;
  const nextEtag = () => String(++counter);

  const userDispose = opts.dispose;
  const cache = new LRUCache({
    max: 1000,
    sizeCalculation:
      opts.maxSize || opts.maxEntrySize
        ? (value, key: string) => {
            return key.length + byteLength(value);
          }
        : undefined,
    ...opts,
    dispose(value, key, reason) {
      etags.delete(key);
      userDispose?.(value, key, reason);
    },
  });

  return {
    name: DRIVER_NAME,
    flags: { cas: true },
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
    getMeta(key) {
      return cache.has(key) ? { etag: etags.get(key) } : null;
    },
    setItem(key, value, tOpts) {
      const wantsCAS = tOpts?.ifMatch !== undefined || tOpts?.ifNoneMatch !== undefined;
      if (wantsCAS) {
        checkCAS(DRIVER_NAME, key, { exists: cache.has(key), etag: etags.get(key) }, tOpts);
      }
      cache.set(key, value);
      const etag = nextEtag();
      etags.set(key, etag);
      return wantsCAS ? { etag } : undefined;
    },
    setItemRaw(key, value, tOpts) {
      const wantsCAS = tOpts?.ifMatch !== undefined || tOpts?.ifNoneMatch !== undefined;
      if (wantsCAS) {
        checkCAS(DRIVER_NAME, key, { exists: cache.has(key), etag: etags.get(key) }, tOpts);
      }
      cache.set(key, value);
      const etag = nextEtag();
      etags.set(key, etag);
      return wantsCAS ? { etag } : undefined;
    },
    removeItem(key) {
      cache.delete(key);
    },
    getKeys() {
      return [...cache.keys()];
    },
    clear() {
      cache.clear();
      etags.clear();
    },
    dispose() {
      cache.clear();
      etags.clear();
    },
  };
};

function byteLength(value: any) {
  if (typeof Buffer !== "undefined") {
    try {
      return Buffer.byteLength(value);
    } catch {
      // ignore
    }
  }
  try {
    return typeof value === "string" ? value.length : JSON.stringify(value).length;
  } catch {
    // ignore
  }
  return 0;
}

export default driver;
