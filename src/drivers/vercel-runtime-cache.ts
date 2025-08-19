import { defineDriver, normalizeKey, joinKeys } from "./utils";
import { getCache } from "@vercel/functions";
import type { RuntimeCache } from "@vercel/functions";

export interface VercelRuntimeCacheOptions {
  /**
   * Optional prefix to use for all keys. Can be used for namespacing.
   */
  base?: string;

  /**
   * Optional namespace to prefix cache keys.
   */
  namespace?: string;

  /**
   * Optional separator string for the namespace.
   */
  namespaceSeparator?: string;

  /**
   * Optional custom hash function for generating keys.
   */
  keyHashFunction?: (key: string) => string;

  /**
   * Default TTL for all items in seconds.
   */
  ttl?: number;

  /**
   * Default tags to apply to all cache entries.
   */
  tags?: string[];
}

const DRIVER_NAME = "vercel-runtime-cache";

export default defineDriver<VercelRuntimeCacheOptions, RuntimeCache>((opts) => {
  const base = normalizeKey(opts?.base);
  const r = (...keys: string[]) => joinKeys(base, ...keys);

  let _cache: any;

  const getClient = () => {
    if (!_cache) {
      _cache = getCache({
        namespace: opts?.namespace,
        namespaceSeparator: opts?.namespaceSeparator,
        keyHashFunction: opts?.keyHashFunction,
      });
    }
    return _cache;
  };

  return {
    name: DRIVER_NAME,
    getInstance: getClient,
    async hasItem(key) {
      const value = await getClient().get(r(key));
      return value !== undefined && value !== null;
    },
    async getItem(key) {
      const value = await getClient().get(r(key));
      return value === undefined ? null : value;
    },
    async setItem(key, value, tOptions) {
      const ttl = tOptions?.ttl ?? opts?.ttl;
      const tags = tOptions?.tags ?? opts?.tags;

      await getClient().set(r(key), value, {
        ttl,
        tags,
      });
    },
    async removeItem(key) {
      await getClient().delete(r(key));
    },
    async getKeys(_base) {
      // Runtime Cache doesn't provide a way to list keys
      return [];
    },
    async clear(_base) {
      // Runtime Cache doesn't provide a way to clear all keys
      // You can only expire by tags
      if (opts?.tags && opts.tags.length > 0) {
        await getClient().expireTag(opts.tags);
      }
    },
  };
});
