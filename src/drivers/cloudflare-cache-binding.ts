/// <reference types="@cloudflare/workers-types" />
import { Request, Response } from "@cloudflare/workers-types/experimental";
import { defineDriver, joinKeys } from "./utils";
import { getCache } from "./utils/cloudflare";

export interface CacheOptions {
  /**
   * Name of the cache to use.
   * The default is `caches.default`, otherwise `caches.open(cacheName)` is used.
   * In Workers for Platforms, `caches.default` is disabled for namespaced scripts, so a cache name must be provided. See Cloudflare's [documentation](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/reference/how-workers-for-platforms-works/#cache-api).
   */
  name?: string;

  /**
   * The hostname to use when interfacing with the cache API.
   * @example example.com
   */
  cacheUrl: string;

  /**
   * Optional prefix to use for all keys. Can be used for namespacing.
   */
  base?: string;

  /**
   * Default TTL for all items in seconds.
   */
  ttl?: number;
}

// https://developers.cloudflare.com/workers/runtime-apis/cache

const DRIVER_NAME = "cloudflare-cache-workers";

export default defineDriver((opts: CacheOptions) => {
  const r = (key: string = "") => (opts.base ? joinKeys(opts.base, key) : key);

  return {
    name: DRIVER_NAME,
    options: opts,
    getInstance: () => getCache(opts.name),
    async hasItem(key) {
      key = r(key);
      const cache = await getCache(opts.name);
      const cacheKey = await getCacheKey(opts.cacheUrl, key);
      return (await cache.match(cacheKey)) !== undefined;
    },
    async getItem(key) {
      key = r(key);
      const cache = await getCache(opts.name);
      const cacheKey = await getCacheKey(opts.cacheUrl, key);
      const response = await cache.match(cacheKey);
      if (!response) {
        return null;
      }
      return await response.text();
    },
    async setItem(key, value, tOptions) {
      key = r(key);
      const cache = await getCache(opts.name);
      const cacheKey = await getCacheKey(opts.cacheUrl, key);
      const cacheValue = new Response(value, {
        headers: {
          "Content-Type": "application/text",
          "Cache-Control": `max-age=${tOptions?.ttl ?? opts.ttl ?? 60}`,
        },
      });
      return await cache.put(cacheKey, cacheValue);
    },
    async removeItem(key) {
      key = r(key);
      const cache = await getCache(opts.name);
      const cacheKey = await getCacheKey(opts.cacheUrl, key);
      await cache.delete(cacheKey);
    },
    /**
     * Not available in the Cloudflare Workers Cache API
     * @see https://developers.cloudflare.com/workers/runtime-apis/cache/#methods
     */
    getKeys() {
      return [];
    },
  };
});

async function getCacheKey(baseURL: string, key: string): Promise<Request> {
  const cacheUrl = new URL(`https://${baseURL}}/${key}`);
  return new Request(cacheUrl.toString());
}
