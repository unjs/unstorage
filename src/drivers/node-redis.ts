import { defineDriver, joinKeys } from "./utils";
import {
  createClient,
  createCluster,
  RESP_TYPES,
  type RedisClientOptions,
  type RedisClusterOptions,
} from "redis";
import { Buffer } from "node:buffer";

export type NodeRedisOptions = {
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
   * Whether to initialize the redis instance immediately.
   * Otherwise, it will be initialized on the first read/write call.
   * @default false
   */
  preConnect?: boolean;
} & (
  | {
      /**
       * Options for connecting to a single instance.
       */
      clientOptions: RedisClientOptions;
    }
  | {
      /**
       * Options to use for cluster mode.
       */
      clusterOptions: RedisClusterOptions;
    }
);

// https://github.com/redis/node-redis/issues/2872
export type RedisClient = ReturnType<typeof createClient>;
export type RedisCluster = ReturnType<typeof createCluster>;

type ProxyClient = ReturnType<
  RedisClient["withTypeMapping"] | RedisCluster["withTypeMapping"]
>;

const DRIVER_NAME = "node-redis";

export default defineDriver((opts: NodeRedisOptions) => {
  let redisClient: Promise<RedisClient> | Promise<RedisCluster>;
  const getRedisClient: () => Promise<
    RedisClient | RedisCluster
  > = async () => {
    if (redisClient) {
      return redisClient;
    }

    let client: RedisClient | RedisCluster;
    if ("clusterOptions" in opts) {
      client = createCluster(opts.clusterOptions);
    } else {
      client = createClient(opts.clientOptions);
    }

    // Avoid unhandled errors
    client.on("error", (error) => {
      console.error(`node-redis error:`, error);
    });

    redisClient = client.connect();

    return redisClient;
  };

  // For getRaw and setRaw we use a proxy client which maps BlobString to Buffer
  // https://github.com/redis/node-redis/blob/master/docs/command-options.md#type-mapping
  let proxyClient: Promise<ProxyClient>;
  const getRedisRawClient: () => Promise<ProxyClient> = async () => {
    if (proxyClient) {
      return proxyClient;
    }

    proxyClient = getRedisClient().then((client) =>
      client.withTypeMapping({
        [RESP_TYPES.BLOB_STRING]: Buffer,
      })
    );

    return proxyClient;
  };

  const base = (opts.base || "").replace(/:$/, "");
  const p = (...keys: string[]) => joinKeys(base, ...keys); // Prefix a key. Uses base for backwards compatibility
  const d = (key: string) => (base ? key.replace(`${base}:`, "") : key); // Deprefix a key

  if (opts.preConnect) {
    getRedisClient();
  }

  const clientScan = async (
    pattern: string,
    client: RedisClient
  ): Promise<string[]> => {
    const keys: string[] = [];

    const iterator = client.scanIterator({
      cursor: "0",
      TYPE: "string",
      MATCH: pattern,
      COUNT: opts.scanCount ?? 100,
    });

    for await (const scanKeys of iterator) {
      keys.push(...scanKeys);
    }

    return keys;
  };

  // Using the scanIterator directly on the cluster is not possible, so
  // each client in the cluster needs to be called.
  // https://github.com/redis/node-redis/issues/2657
  const clusterScan = async (
    pattern: string,
    cluster: RedisCluster
  ): Promise<string[]> => {
    const results = await Promise.all(
      cluster.masters.map(async (master) => {
        const client = await cluster.nodeClient(master);
        return await clientScan(pattern, client);
      })
    );

    return results.flat();
  };

  const scan = async (pattern: string): Promise<string[]> => {
    const client = await getRedisClient();

    if ("scanIterator" in client) {
      return await clientScan(pattern, client as RedisClient);
    } else {
      return await clusterScan(pattern, client as RedisCluster);
    }
  };

  return {
    name: DRIVER_NAME,
    options: opts,
    async hasItem(key) {
      const client = await getRedisClient();
      return Boolean(await client.exists(p(key)));
    },
    async getItem(key) {
      const client = await getRedisClient();
      const value = await client.get(p(key));
      return value ?? null;
    },
    async getItemRaw(key) {
      const client = await getRedisRawClient();
      const value = client.get(p(key));
      return value ?? null;
    },
    async getItems(items) {
      const client = await getRedisClient();
      const keys = items.map((item) => p(item.key));
      const data = await client.mGet(keys);

      return keys.map((key, index) => {
        return {
          key: d(key),
          value: data[index] ?? null,
        };
      });
    },
    async setItem(key, value, tOptions) {
      const client = await getRedisClient();
      const ttl = tOptions?.ttl ?? opts.ttl;
      if (ttl) {
        await client.set(p(key), value, {
          expiration: { type: "EX", value: ttl },
        });
      } else {
        await client.set(p(key), value);
      }
    },
    async setItemRaw(key, value, tOptions) {
      const ttl = tOptions?.ttl ?? opts.ttl;
      const client = await getRedisRawClient();
      if (ttl) {
        await client.set(p(key), value, {
          expiration: { type: "EX", value: ttl },
        });
      } else {
        await client.set(p(key), value);
      }
    },
    async removeItem(key) {
      const client = await getRedisClient();
      await client.unlink(p(key));
    },
    async getKeys(base) {
      const keys = await scan(p(base, "*"));
      return keys.map((key) => d(key));
    },
    async clear(base) {
      const client = await getRedisClient();
      const keys = await scan(p(base, "*"));
      if (keys.length === 0) {
        return;
      }
      await client.unlink(keys);
    },
    async dispose() {
      const client = await getRedisClient();
      return client.destroy();
    },
  };
});
