import { defineDriver, joinKeys } from "./utils/index.ts";
import { Cluster, Redis } from "ioredis";

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
}

const DRIVER_NAME = "redis";

export default defineDriver((opts: RedisOptions) => {
  let redisClient: Redis | Cluster;
  let unwatch: (() => Promise<void> | void) | undefined;
  let subscribers: Redis[] = [];
  const getRedisClient = () => {
    if (redisClient) {
      return redisClient;
    }
    if (opts.cluster) {
      redisClient = new Redis.Cluster(opts.cluster, opts.clusterOptions);
    } else if (opts.url) {
      redisClient = new Redis(opts.url, opts);
    } else {
      redisClient = new Redis(opts);
    }
    return redisClient;
  };

  const base = (opts.base || "").replace(/:$/, "");
  const p = (...keys: string[]) => joinKeys(base, ...keys); // Prefix a key. Uses base for backwards compatibility
  const d = (key: string) => (base ? key.replace(`${base}:`, "") : key); // Deprefix a key
  const dbIndex = opts.db ?? 0;
  const channelPrefix = `__keyspace@${dbIndex}__:`;
  const keyPattern = base ? `${base}:*` : "*";
  const channelPattern = `${channelPrefix}${keyPattern}`;

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
      if (unwatch) {
        Promise.resolve(unwatch()).catch(() => {});
        unwatch = undefined;
      }
      return getRedisClient().disconnect();
    },
    async watch(callback) {
      if (unwatch) {
        return unwatch;
      }

      const removeEvents = new Set(["del", "unlink", "expired", "evicted"]);

      const handleMessage = (channel: string, event: string) => {
        if (!channel.startsWith(channelPrefix)) {
          return;
        }
        const rawKey = channel.slice(channelPrefix.length);
        if (base && !rawKey.startsWith(`${base}:`)) {
          return;
        }
        const key = d(rawKey);
        const type = removeEvents.has(event) ? "remove" : "update";
        callback(type, key);
      };

      const createSubscriber = (client: Redis) => {
        const sub = client.duplicate();
        sub.on("pmessage", (_pattern, channel, message) => {
          handleMessage(channel, message);
        });
        subscribers.push(sub);
        return sub;
      };

      await getRedisClient().config("SET", "notify-keyspace-events", "K$gx");

      const client = getRedisClient();
      if (client instanceof Cluster) {
        const nodes = client.nodes("master");
        await Promise.all(
          nodes.map(async (node) => {
            const sub = createSubscriber(node);
            await sub.psubscribe(channelPattern);
          })
        );
      } else {
        const sub = createSubscriber(client);
        await sub.psubscribe(channelPattern);
      }

      unwatch = async () => {
        await Promise.all(
          subscribers.map(async (sub) => {
            await sub.punsubscribe(channelPattern);
            await sub.disconnect();
          })
        );
        subscribers = [];
        unwatch = undefined;
      };

      return unwatch;
    },
  };
});
