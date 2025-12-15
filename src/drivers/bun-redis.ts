/// <reference types="bun-types" />

import { type RedisOptions as _RedisOptions, RedisClient } from "bun";
import { defineDriver, joinKeys } from "./utils/index.ts";

export interface RedisOptions extends _RedisOptions {
  /**
   * Optional prefix to use for all keys. Can be used for namespacing.
   */
  base?: string;

  /**
   * Url to use for connecting to redis. Takes precedence over `host` option. Has the format `redis://<REDIS_USER>:<REDIS_PASSWORD>@<REDIS_HOST>:<REDIS_PORT>`
   */
  url?: string;

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

  /**
   * Whether to initialize the redis instance immediately.
   * Otherwise, it will be initialized on the first read/write call.
   * @default false
   */
  preConnect?: boolean;
}

const DRIVER_NAME = "bun-redis";

export default defineDriver((opts: RedisOptions) => {
  let redisClient: RedisClient;
  const getRedisClient = () => {
    if (redisClient) {
      return redisClient;
    }
    const { url, ...redisOpts } = opts;
    if (url) {
      redisClient = new RedisClient(url, redisOpts);
    } else {
      redisClient = new RedisClient();
    }
    return redisClient;
  };

  const base = (opts.base || "").replace(/:$/, "");
  const p = (...keys: string[]) => joinKeys(base, ...keys);
  const d = (key: string) => (base ? key.replace(`${base}:`, "") : key);

  if (opts.preConnect) {
    try {
      getRedisClient();
    } catch {
      // Silent fail
    }
  }

  const scan = async (pattern: string): Promise<string[]> => {
    const client = getRedisClient();
    const keys: string[] = [];
    let cursor = "0";
    do {
      const [nextCursor, scanKeys] = opts.scanCount
        ? await client.scan(cursor, "MATCH", pattern, "COUNT", opts.scanCount)
        : await client.scan(cursor, "MATCH", pattern);
      cursor = nextCursor;
      keys.push(...scanKeys);
    } while (cursor !== "0");
    return keys;
  };

  return {
    name: DRIVER_NAME,
    options: opts,
    getInstance: getRedisClient,
    async hasItem(key) {
      const result = await getRedisClient().exists(p(key));
      return Boolean(result);
    },
    async getItem(key) {
      const value = await getRedisClient().get(p(key));
      return value ?? null;
    },
    async getItems(items) {
      const keys = items.map((item) => p(item.key));
      const data = await getRedisClient().mget(...keys);

      return keys.map((key, index) => {
        return {
          key: d(key),
          value: data[index] ?? null,
        };
      });
    },
    async setItem(key, value, tOptions) {
      const ttl = tOptions?.ttl ?? opts.ttl;
      if (ttl) {
        await getRedisClient().set(p(key), value, "EX", String(ttl));
      } else {
        await getRedisClient().set(p(key), value);
      }
    },
    async removeItem(key) {
      await getRedisClient().del(p(key));
    },
    async getKeys(base) {
      const keys = await scan(p(base, "*"));
      return keys.map((key) => d(key));
    },
    async clear(base) {
      const keys = await scan(p(base, "*"));
      if (keys.length === 0) {
        return;
      }
      await getRedisClient().del(...keys);
    },
    dispose() {
      return getRedisClient().close();
    },
  };
});
