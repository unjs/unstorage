import { createClient } from "@vercel/kv";
import type { VercelKV } from "@vercel/kv";
import type { RedisConfigNodejs } from "@upstash/redis";

import { defineDriver, normalizeKey, joinKeys, createError } from "./utils";

export interface VercelKVOptions extends Partial<RedisConfigNodejs> {
  /**
   * Optional prefix to use for all keys. Can be used for namespacing.
   */
  base?: string;

  /**
   * Optional flag to customize environment variable prefix (Default is `KV`). Set to `false` to disable env inference for `url` and `token` options
   */
  env?: false | string;

  /**
   * Default TTL for all items in seconds.
   */
  ttl?: number;
}

const DRIVER_NAME = "vercel-kv";

export default defineDriver<VercelKVOptions, VercelKV>((opts) => {
  const base = normalizeKey(opts?.base);
  const r = (...keys: string[]) => joinKeys(base, ...keys);

  let _client: VercelKV;
  const getClient = () => {
    if (!_client) {
      const envPrefix =
        typeof process !== "undefined" && opts.env !== false
          ? `${opts.env || "KV"}_`
          : "";
      if (!opts.url) {
        const envName = envPrefix + "REST_API_URL";
        if (envPrefix && process.env[envName]) {
          opts.url = process.env[envName];
        } else {
          throw createError(
            "vercel-kv",
            `missing required \`url\` option or '${envName}' env.`
          );
        }
      }
      if (!opts.token) {
        const envName = envPrefix + "REST_API_TOKEN";
        if (envPrefix && process.env[envName]) {
          opts.token = process.env[envName];
        } else {
          throw createError(
            "vercel-kv",
            `missing required \`token\` option or '${envName}' env.`
          );
        }
      }
      _client = createClient(
        opts as VercelKVOptions & { url: string; token: string }
      );
    }
    return _client;
  };

  return {
    name: DRIVER_NAME,
    getInstance: getClient,
    hasItem(key) {
      return getClient().exists(r(key)).then(Boolean);
    },
    getItem(key) {
      return getClient().get(r(key));
    },
    setItem(key, value, tOptions) {
      const ttl = tOptions?.ttl ?? opts.ttl;
      return getClient()
        .set(r(key), value, ttl ? { ex: ttl } : undefined)
        .then(() => {});
    },
    removeItem(key) {
      return getClient()
        .del(r(key))
        .then(() => {});
    },
    getKeys(base) {
      return getClient().keys(r(base, "*"));
    },
    async clear(base) {
      const keys = await getClient().keys(r(base, "*"));
      if (keys.length === 0) {
        return;
      }
      return getClient()
        .del(...keys)
        .then(() => {});
    },
  };
});
