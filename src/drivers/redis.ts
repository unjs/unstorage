import { createHash } from "node:crypto";
import { type DriverFactory, joinKeys } from "./utils/index.ts";
import { Cluster, Redis } from "ioredis";
import { CASMismatchError } from "./utils/cas.ts";

import type { ClusterOptions, ClusterNode, RedisOptions as _RedisOptions } from "ioredis";

// Content-addressable etag: SHA-1 of the stored bytes. Stable across writers
// of the same value; no companion key or Lua script (compatible with the
// ioredis-mock subset that lacks `redis.sha1hex` / full EVAL).
const computeEtag = (value: string | Buffer | number): string => {
  const buf = Buffer.isBuffer(value)
    ? value
    : Buffer.from(typeof value === "string" ? value : String(value));
  return createHash("sha1").update(buf).digest("hex");
};

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

const driver: DriverFactory<RedisOptions, Redis | Cluster> = (opts) => {
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
  const d = (key: string) => (base ? key.replace(`${base}:`, "") : key); // Deprefix a key

  const setWithCAS = async (
    key: string,
    value: string | Buffer | number,
    tOptions: { ifMatch?: string; ifNoneMatch?: string; ttl?: number } | undefined,
  ): Promise<{ etag: string }> => {
    const k = p(key);
    const client = getRedisClient();
    const ttl = tOptions?.ttl ?? opts.ttl ?? 0;
    const ifMatch = tOptions?.ifMatch;
    const ifNoneMatch = tOptions?.ifNoneMatch;

    // Fast path: atomic create-only via `SET ... NX`.
    if (ifNoneMatch === "*" && ifMatch === undefined) {
      const result = ttl
        ? await client.set(k, value as any, "EX", ttl, "NX")
        : await client.set(k, value as any, "NX");
      if (result === null) {
        throw new CASMismatchError(DRIVER_NAME, key);
      }
      return { etag: computeEtag(value) };
    }

    // General path: WATCH + check + MULTI/EXEC. EXEC returns null if the
    // watched key was modified between WATCH and EXEC, which we surface as
    // a CAS mismatch (the caller's read became stale).
    await client.watch(k);
    try {
      const cur = await client.getBuffer(k);
      const exists = cur !== null;
      const curEtag = exists ? computeEtag(cur) : undefined;

      let mismatch = false;
      if (ifNoneMatch !== undefined) {
        mismatch =
          ifNoneMatch === "*" ? exists : exists && curEtag === ifNoneMatch;
      }
      if (!mismatch && ifMatch !== undefined) {
        mismatch =
          ifMatch === "*" ? !exists : !exists || curEtag !== ifMatch;
      }
      if (mismatch) {
        await client.unwatch();
        throw new CASMismatchError(DRIVER_NAME, key);
      }

      const multi = client.multi();
      if (ttl) {
        multi.set(k, value as any, "EX", ttl);
      } else {
        multi.set(k, value as any);
      }
      const result = await multi.exec();
      if (result === null) {
        throw new CASMismatchError(DRIVER_NAME, key);
      }
      return { etag: computeEtag(value) };
    } catch (err) {
      await client.unwatch().catch(() => {});
      throw err;
    }
  };

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
    flags: { cas: true },
    options: opts,
    getInstance: getRedisClient,
    async hasItem(key) {
      return Boolean(await getRedisClient().exists(p(key)));
    },
    async getItem(key) {
      const value = await getRedisClient().get(p(key));
      return value ?? null;
    },
    async getItemRaw(key: string) {
      const value = await getRedisClient().getBuffer(p(key));
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
    async getMeta(key) {
      const cur = await getRedisClient().getBuffer(p(key));
      return cur === null ? null : { etag: computeEtag(cur) };
    },
    async setItem(key, value, tOptions) {
      if (tOptions?.ifMatch !== undefined || tOptions?.ifNoneMatch !== undefined) {
        return setWithCAS(key, value, tOptions);
      }
      const ttl = tOptions?.ttl ?? opts.ttl;
      if (ttl) {
        await getRedisClient().set(p(key), value, "EX", ttl);
      } else {
        await getRedisClient().set(p(key), value);
      }
    },
    async setItemRaw(key, value, tOptions) {
      const _value = normalizeValue(value);
      if (tOptions?.ifMatch !== undefined || tOptions?.ifNoneMatch !== undefined) {
        return setWithCAS(key, _value, tOptions);
      }
      const ttl = tOptions?.ttl ?? opts.ttl;
      if (ttl) {
        await getRedisClient().set(p(key), _value, "EX", ttl);
      } else {
        await getRedisClient().set(p(key), _value);
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
};

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

export default driver;
