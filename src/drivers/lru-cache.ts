import {
  type DriverFactory,
  importLib,
  type LibImport,
  type DriverDependencies,
} from "./utils/index.ts";
import { checkCAS } from "./utils/cas.ts";
import type { LRUCache } from "lru-cache";

type LRUCacheOptions = LRUCache.OptionsBase<string, any, any> &
  Partial<LRUCache.OptionsMaxLimit<string, any, any>> &
  Partial<LRUCache.OptionsSizeLimit<string, any, any>> &
  Partial<LRUCache.OptionsTTLLimit<string, any, any>>;

export interface LRUDriverOptions extends LRUCacheOptions {
  /**
   * Optionally provide the [`lru-cache`](https://www.npmjs.com/package/lru-cache) library
   * to avoid dynamically importing it.
   */
  lib?: LibImport<typeof import("lru-cache")>;
}

export const DRIVER_DEPENDENCIES: DriverDependencies = {
  lib: { name: "lru-cache", version: "^11.2.6" },
};

const DRIVER_NAME = "lru-cache";

const driver: DriverFactory<LRUDriverOptions, Promise<LRUCache<string, any, any>>> = (
  opts = {},
) => {
  const etags = new Map<string, string>();
  let counter = 0;
  const nextEtag = () => String(++counter);

  const userDispose = opts.dispose;

  let _cache: Promise<LRUCache<string, any, any>> | undefined;
  const getCache = () =>
    (_cache ??= (async () => {
      const { LRUCache } = await importLib(
        DRIVER_NAME,
        "lru-cache",
        opts.lib,
        () => import("lru-cache"),
      );
      return new LRUCache({
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
    })());

  return {
    name: DRIVER_NAME,
    flags: { cas: true },
    options: opts,
    getInstance: getCache,
    async hasItem(key) {
      return (await getCache()).has(key);
    },
    async getItem(key) {
      return (await getCache()).get(key) ?? null;
    },
    async getItemRaw(key) {
      return (await getCache()).get(key) ?? null;
    },
    async getMeta(key) {
      return (await getCache()).has(key) ? { etag: etags.get(key) } : null;
    },
    async setItem(key, value, tOpts) {
      const cache = await getCache();
      const wantsCAS = tOpts?.ifMatch !== undefined || tOpts?.ifNoneMatch !== undefined;
      if (wantsCAS) {
        checkCAS(DRIVER_NAME, key, { exists: cache.has(key), etag: etags.get(key) }, tOpts);
      }
      cache.set(key, value);
      const etag = nextEtag();
      etags.set(key, etag);
      return wantsCAS ? { etag } : undefined;
    },
    async setItemRaw(key, value, tOpts) {
      const cache = await getCache();
      const wantsCAS = tOpts?.ifMatch !== undefined || tOpts?.ifNoneMatch !== undefined;
      if (wantsCAS) {
        checkCAS(DRIVER_NAME, key, { exists: cache.has(key), etag: etags.get(key) }, tOpts);
      }
      cache.set(key, value);
      const etag = nextEtag();
      etags.set(key, etag);
      return wantsCAS ? { etag } : undefined;
    },
    async removeItem(key) {
      (await getCache()).delete(key);
    },
    async getKeys() {
      return [...(await getCache()).keys()];
    },
    async clear() {
      (await _cache)?.clear();
      etags.clear();
    },
    async dispose() {
      (await _cache)?.clear();
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
