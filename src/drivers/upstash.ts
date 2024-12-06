import { RedisConfigNodejs, Redis } from "@upstash/redis";
import { normalizeKey, defineDriver, joinKeys } from "./utils";

export interface UpstashOptions extends RedisConfigNodejs {
  /**
   * Optional prefix to use for all keys. Can be used for namespacing.
   */
  base?: string;

  /**
   * Default TTL for all items in seconds.
   */
  ttl?: number;
}

const DRIVER_NAME = "upstash-redis";

export default defineDriver<UpstashOptions, Redis>(
  (options: UpstashOptions) => {
    const base = normalizeKey(options?.base);
    const r = (...keys: string[]) => joinKeys(base, ...keys);

    let redisClient: Redis;
    const getClient = () => {
      if (redisClient) {
        return redisClient;
      }
      redisClient = new Redis(options);

      return redisClient;
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
        const ttl = tOptions?.ttl || options.ttl;
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
  }
);
