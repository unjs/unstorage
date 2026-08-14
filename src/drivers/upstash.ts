import type { RedisConfigNodejs, Redis } from "@upstash/redis";
import {
  type DriverFactory,
  importLib,
  type LibImport,
  normalizeKey,
  joinKeys,
  type DriverDependencies,
} from "./utils/index.ts";

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

  /**
   * Optionally provide the [`@upstash/redis`](https://www.npmjs.com/package/@upstash/redis) library
   * to avoid dynamically importing it.
   */
  lib?: LibImport<typeof import("@upstash/redis")>;
}

export const DRIVER_DEPENDENCIES: DriverDependencies = {
  lib: { name: "@upstash/redis", version: "^1.36.2" },
};

const DRIVER_NAME = "upstash";

const driver: DriverFactory<UpstashOptions, Promise<Redis>> = (options) => {
  const base = normalizeKey(options?.base);
  const r = (...keys: string[]) => joinKeys(base, ...keys);

  let redisClient: Promise<Redis> | undefined;
  const getClient = () =>
    (redisClient ??= (async () => {
      const { Redis } = await importLib(
        DRIVER_NAME,
        "@upstash/redis",
        options.lib,
        () => import("@upstash/redis"),
      );
      const url = options.url || globalThis.process?.env?.UPSTASH_REDIS_REST_URL;
      const token = options.token || globalThis.process?.env?.UPSTASH_REDIS_REST_TOKEN;
      return new Redis({ url, token, ...options } as RedisConfigNodejs);
    })());

  const scan = async (pattern: string): Promise<string[]> => {
    const client = await getClient();
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
      return Boolean(await (await getClient()).exists(r(key)));
    },
    async getItem(key) {
      return await (await getClient()).get(r(key));
    },
    async getItems(items) {
      const keys = items.map((item) => r(item.key));
      const data = await (await getClient()).mget(...keys);

      return keys.map((key, index) => {
        return {
          key: base ? key.slice(base.length + 1) : key,
          value: data[index] ?? null,
        };
      });
    },
    async setItem(key, value, tOptions) {
      const ttl = tOptions?.ttl || options.ttl;
      return (await getClient()).set(r(key), value, ttl ? { ex: ttl } : undefined).then(() => {});
    },
    async removeItem(key) {
      await (await getClient()).unlink(r(key));
    },
    async getKeys(_base) {
      return await scan(r(_base, "*")).then((keys) =>
        base ? keys.map((key) => key.slice(base.length + 1)) : keys,
      );
    },
    async clear(base) {
      const keys = await scan(r(base, "*"));
      if (keys.length === 0) {
        return;
      }
      await (await getClient()).del(...keys);
    },
  };
};

export default driver;
