import { type RedisConfigNodejs, Redis } from "@upstash/redis";
import { type DriverFactory, normalizeKey, joinKeys } from "./utils/index.ts";

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

const driver: DriverFactory<UpstashOptions, Redis> = (
  (options) => {
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
      async hasItem(key) {
        return Boolean(await getClient().exists(r(key)));
      },
      async getItem(key) {
        return await getClient().get(r(key));
      },
      async getItems(items) {
        const keys = items.map((item) => r(item.key));
        const data = await getClient().mget(...keys);

        return keys.map((key, index) => {
          return {
            key: base ? key.slice(base.length + 1) : key,
            value: data[index] ?? null,
          };
        });
      },
      async setItem(key, value, tOptions) {
        const ttl = tOptions?.ttl || options.ttl;
        return getClient()
          .set(r(key), value, ttl ? { ex: ttl } : undefined)
          .then(() => {});
      },
      async removeItem(key) {
        await getClient().unlink(r(key));
      },
      async getKeys(_base) {
        return await scan(r(_base, "*")).then((keys) =>
          base ? keys.map((key) => key.slice(base.length + 1)) : keys
        );
      },
      async clear(base) {
        const keys = await scan(r(base, "*"));
        if (keys.length === 0) {
          return;
        }
        await getClient().del(...keys);
      },
    };
  }
);


export default driver;
