import { type RedisConfigNodejs, Redis } from "@upstash/redis";
import { defineDriver, normalizeKey, joinKeys } from "./utils";

export interface UpstashOptions extends Partial<RedisConfigNodejs> {
  /**
   * Optional prefix to use for all keys. Can be used for namespacing.
   */
  base?: string;

  /**
   * Default TTL for all items in seconds.
   */
  ttl?: number;

  /**
   * How many keys to scan at once.
   *
   * [redis documentation](https://redis.io/docs/latest/commands/scan/#the-count-option)
   */
  scanCount?: number;
}

const DRIVER_NAME = "upstash";

export default defineDriver<UpstashOptions, Redis>(
  (options: UpstashOptions = {}) => {
    const base = normalizeKey(options?.base);
    const r = (...keys: string[]) => joinKeys(base, ...keys);

    let redisClient: Redis;
    const getClient = () => {
      if (redisClient) {
        return redisClient;
      }
      const url =
        options.url || globalThis.process?.env?.UPSTASH_REDIS_REST_URL;
      const token =
        options.token || globalThis.process?.env?.UPSTASH_REDIS_REST_TOKEN;
      redisClient = new Redis({ url, token, ...options });
      return redisClient;
    };

    const scan = async (pattern: string): Promise<string[]> => {
      const client = getClient();
      const keys: string[] = [];
      let cursor = "0";
      do {
        const [nextCursor, scanKeys] = await client.scan(cursor, {
          match: pattern,
          count: options.scanCount,
        });
        cursor = nextCursor;
        keys.push(...scanKeys);
      } while (cursor !== "0");
      return keys;
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
          .unlink(r(key))
          .then(() => {});
      },
      getKeys(_base) {
        return scan(r(_base, "*")).then((keys) =>
          base ? keys.map((key) => key.slice(base.length + 1)) : keys
        );
      },
      async clear(base) {
        const keys = await scan(r(base, "*"));
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
