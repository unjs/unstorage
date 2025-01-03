import type { TransactionOptions } from "../types";
import { defineDriver, joinKeys, createError } from "./utils";
// TODO: use named import in v2
import Redis, {
  Cluster,
  type ClusterNode,
  type ClusterOptions,
  type RedisOptions as _RedisOptions,
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
   * Whether to save Buffer/Uint8Arry as binary data or a base64-encoded string
   * This option applies to the experimental getItemRaw/setItemRaw methods
   */
  saveRawAsBinary?: boolean;
}

const DRIVER_NAME = "redis";

export default defineDriver((opts: RedisOptions) => {
  let redisClient: Redis | Cluster;
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
  const d = (key: string) => (base ? key.replace(base, "") : key); // Deprefix a key

  const getItem = async (key: string) => {
    const value = await getRedisClient().get(p(key));
    return value ?? null;
  };

  const setItem = async (
    key: string,
    value: any,
    tOptions: TransactionOptions
  ) => {
    const ttl = tOptions?.ttl ?? opts.ttl;
    if (ttl) {
      await getRedisClient().set(p(key), value, "EX", ttl);
    } else {
      await getRedisClient().set(p(key), value);
    }
  };

  const getItemRaw = async (key: string) => {
    const value = await getRedisClient().getBuffer(p(key));
    return value ?? null;
  };

  const setItemRaw = async (
    key: string,
    value: Uint8Array,
    tOptions: TransactionOptions
  ) => {
    let valueToSave: Buffer;
    if (value instanceof Uint8Array) {
      if (value instanceof Buffer) {
        valueToSave = value;
      } else {
        valueToSave = Buffer.copyBytesFrom(
          value,
          value.byteOffset,
          value.byteLength
        );
      }
    } else {
      throw createError(DRIVER_NAME, "Expected Buffer or Uint8Array");
    }

    await setItem(key, valueToSave, tOptions);
  };

  return {
    name: DRIVER_NAME,
    options: opts,
    getInstance: getRedisClient,
    async hasItem(key) {
      return Boolean(await getRedisClient().exists(p(key)));
    },
    getItem,
    setItem,
    ...(opts.saveRawAsBinary
      ? {
          getItemRaw,
          setItemRaw,
        }
      : {}),
    async removeItem(key) {
      await getRedisClient().del(p(key));
    },
    async getKeys(base) {
      const keys: string[] = await getRedisClient().keys(p(base, "*"));
      return keys.map((key) => d(key));
    },
    async clear(base) {
      const keys = await getRedisClient().keys(p(base, "*"));
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
