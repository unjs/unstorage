import { defineDriver } from "./utils";
import Redis, {
  Cluster,
  ClusterNode,
  ClusterOptions,
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
}

export default defineDriver((opts: RedisOptions = {}) => {
  let redisClient: Redis | Cluster;
  const getRedisClient = () => {
    if (redisClient) {
      return redisClient;
    }
    if (!opts.url && !opts.cluster) {
      throw new Error(
        "Redis driver requires either a host, url or cluster option"
      );
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

  const p = (key: string) => (opts.base ? `${opts.base}:${key}` : key); // Prefix a key. Uses base for backwards compatibility
  const d = (key: string) => (opts.base ? key.replace(opts.base, "") : key); // Deprefix a key

  return {
    async hasItem(key) {
      return Boolean(await getRedisClient().exists(p(key)));
    },
    async getItem(key) {
      const value = await getRedisClient().get(p(key));
      return value === null ? null : value;
    },
    async setItem(key, value) {
      await getRedisClient().set(p(key), value);
    },
    async removeItem(key) {
      await getRedisClient().del(p(key));
    },
    async getKeys() {
      const keys: string[] = await getRedisClient().keys(p("*"));
      return keys.map((key) => d(key));
    },
    async clear() {
      const keys = await getRedisClient().keys(p("*"));
      if (keys.length === 0) {
        return;
      }
      return getRedisClient()
        .del(keys)
        .then(() => {});
    },
    dispose() {
      return getRedisClient().disconnect();
    },
  };
});
