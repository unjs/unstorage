import { defineDriver, joinKeys } from "./utils/index.ts";
import { Cluster, Redis } from "ioredis";
import pkg from "../../package.json" with { type: "json" };

import type {
  ClusterOptions,
  ClusterNode,
  RedisOptions as _RedisOptions,
} from "ioredis";

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
   * List of redis nodes to use for cluster mode. Takes precedence over `url` and `host` options.
   */
  cluster?: ClusterNode[];

  /**
   * Options to use for cluster mode.
   */
  clusterOptions?: ClusterOptions;

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

  /**
   * Tag to append to the library name in CLIENT SETINFO (ioredis(tag)).
   * This helps identify the higher-level library using ioredis.
   * @link https://redis.io/docs/latest/commands/client-setinfo/
   * @default "unstorage_vX.X.X" (with version) or "unstorage" (fallback)
   */
  clientInfoTag?: string;
}

const DRIVER_NAME = "redis";

function getDefaultClientInfoTag(): string {
  return `unstorage_v${pkg.version}`;
}

export default defineDriver((opts: RedisOptions) => {
  let redisClient: Redis | Cluster;
  const getRedisClient = () => {
    if (redisClient) {
      return redisClient;
    }

    // Set default clientInfoTag to "unstorage_vX.X.X" if not explicitly set
    const options = {
      ...opts,
      clientInfoTag: opts.clientInfoTag ?? getDefaultClientInfoTag(),
    };

    if (options.cluster) {
      const clusterOptions = {
        ...options.clusterOptions,
        redisOptions: {
          clientInfoTag: options.clientInfoTag,
          ...options.clusterOptions?.redisOptions,
        },
      };
      redisClient = new Redis.Cluster(options.cluster, clusterOptions);
    } else if (options.url) {
      redisClient = new Redis(options.url, options);
    } else {
      redisClient = new Redis(options);
    }
    return redisClient;
  };

  const base = (opts.base || "").replace(/:$/, "");
  const p = (...keys: string[]) => joinKeys(base, ...keys); // Prefix a key. Uses base for backwards compatibility
  const d = (key: string) => (base ? key.replace(`${base}:`, "") : key); // Deprefix a key

  if (opts.preConnect) {
    try {
      getRedisClient();
    } catch (error) {
      console.error(error);
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
      return Boolean(await getRedisClient().exists(p(key)));
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
        await getRedisClient().set(p(key), value, "EX", ttl);
      } else {
        await getRedisClient().set(p(key), value);
      }
    },
    async removeItem(key) {
      await getRedisClient().unlink(p(key));
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
      await getRedisClient().unlink(keys);
    },
    dispose() {
      return getRedisClient().disconnect();
    },
  };
});
