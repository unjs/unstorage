import type {
  Cache as CFCache,
  CacheStorage as CFCacheStorage,
  Response as CFResponse,
} from "@cloudflare/workers-types";

import { type DriverFactory, joinKeys } from "./utils/index.ts";

export interface CacheOptions {
  /**
   * Optional prefix to use for all keys. Can be used for namespacing.
   */
  base?: string;

  /**
   * Default TTL for all items in seconds.
   */
  ttl?: number;

  /**
   * Name of the cache to use.
   * The default is `caches.default`, otherwise `caches.open(cacheName)` is used.
   * In Workers for Platforms, `caches.default` is disabled for namespaced scripts, so a cache name must be provided. See Cloudflare's [documentation](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/reference/how-workers-for-platforms-works/#cache-api).
   */
  name?: string;
}

// https://developers.cloudflare.com/workers/runtime-apis/cache

const DRIVER_NAME = "cloudflare-cache-binding";

const driver: DriverFactory<CacheOptions, CFCache | Promise<CFCache>> = (opts) => {
  const r = (key: string = "") => {
    if (opts.base) {
      key = joinKeys(opts.base, key);
    }
    return `unstorage://${key.replace(/:/g, "/")}`;
  };

  let _cache: CFCache | Promise<CFCache> | undefined;
  const getCache = () => {
    if (_cache) {
      return _cache;
    }
    if (opts.name) {
      _cache = (globalThis.caches as unknown as CFCacheStorage).open(opts.name);
    } else {
      _cache = (globalThis.caches as unknown as CFCacheStorage).default;
    }
    return _cache;
  };

  return {
    name: DRIVER_NAME,
    options: opts,
    getInstance: () => getCache(),

    async hasItem(key) {
      const cacheKey = r(key);
      const cache = await getCache();
      const match = await cache.match(cacheKey);
      return match !== undefined;
    },

    async getItem(key) {
      const cacheKey = r(key);
      const cache = await getCache();
      const response = await cache.match(cacheKey);
      return response ? await response.text() : null;
    },

    async getItemRaw(key) {
      const cacheKey = r(key);
      const cache = await getCache();
      const response = await cache.match(cacheKey);
      return response ? await response.arrayBuffer() : null;
    },

    async setItem(key, value, tOptions) {
      return this.setItemRaw!(key, value, tOptions);
    },

    async setItemRaw(key, value, tOptions) {
      const cacheKey = r(key);

      // https://developers.cloudflare.com/workers/runtime-apis/cache/#headers
      const headers = {} as Record<string, string>;
      const ttl = tOptions?.ttl ?? opts.ttl;
      if (ttl) {
        headers["Cache-Control"] = `max-age=${ttl}`;
      }
      if (tOptions.tag) {
        headers["Cache-Tag"] = tOptions.tag;
      }

      const cacheValue = new Response(value, { headers });

      const cache = await getCache();
      await cache.put(cacheKey, cacheValue as unknown as CFResponse);
    },

    async removeItem(key) {
      const cacheKey = r(key);
      const cache = await getCache();
      await cache.delete(cacheKey);
    },

    getKeys() {
      return [];
    },
  };
};

export default driver;
