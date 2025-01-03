import type { TransactionOptions } from "../types";
import { defineDriver, joinKeys } from "./utils";
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
   * If enabled, `getItemRaw` and `setItemRaw` will use binary data instead of base64 encoded strings.
   * This option will be enabled by default in the next major version.
   */
  raw?: boolean;
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
    getItemRaw:
      opts.raw === true
        ? async (key: string) => {
            const value = await getRedisClient().getBuffer(p(key));
            return value ?? null;
          }
        : undefined,
    async setItem(key, value, tOptions) {
      const ttl = tOptions?.ttl ?? opts.ttl;
      if (ttl) {
        await getRedisClient().set(p(key), value, "EX", ttl);
      } else {
        await getRedisClient().set(p(key), value);
      }
    },
    setItemRaw:
      opts.raw === true
        ? async (key: string, value: unknown, tOptions: TransactionOptions) => {
            const _value = normalizeValue(value);
            const ttl = tOptions?.ttl ?? opts.ttl;
            if (ttl) {
              await getRedisClient().set(p(key), _value, "EX", ttl);
            } else {
              await getRedisClient().set(p(key), _value);
            }
          }
        : undefined,
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

function normalizeValue(value: unknown): Buffer | string | number {
  const type = typeof value;
  if (type === "string" || type === "number") {
    return value as string | number;
  }
  if (Buffer.isBuffer(value)) {
    return value;
  }
  if (isTypedArray(value)) {
    if (Buffer.copyBytesFrom) {
      return Buffer.copyBytesFrom(value, value.byteOffset, value.byteLength);
    } else {
      return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
    }
  }
  if (value instanceof ArrayBuffer) {
    return Buffer.from(value);
  }
  return JSON.stringify(value);
}

function isTypedArray(value: unknown): value is TypedArray {
  return (
    value instanceof Int8Array ||
    value instanceof Uint8Array ||
    value instanceof Uint8ClampedArray ||
    value instanceof Int16Array ||
    value instanceof Uint16Array ||
    value instanceof Int32Array ||
    value instanceof Uint32Array ||
    value instanceof Float32Array ||
    value instanceof Float64Array ||
    value instanceof BigInt64Array ||
    value instanceof BigUint64Array
  );
}
