import {
  type DriverFactory,
  escapeRedisGlob,
  importLib,
  joinKeys,
  type LibImport,
  type DriverDependencies,
} from "./utils/index.ts";
import { normalizeValue } from "./utils/redis.ts";
import type {
  RedisClientOptions,
  RedisClientType,
  RedisClusterOptions,
  RedisClusterType,
  SetOptions,
} from "redis";

// `keyPrefix` (redis v6) is not supported: SCAN patterns and replies are not prefixed. Use `base` instead.
export interface NodeRedisOptions extends Omit<RedisClientOptions, "keyPrefix"> {
  /**
   * Optional prefix to use for all keys. Can be used for namespacing.
   */
  base?: string;

  /**
   * Url to use for connecting to redis. Has the format `redis[s]://[[username][:password]@][host][:port][/db-number]`
   */
  url?: string;

  /**
   * Options to use for cluster mode (see [`createCluster`](https://github.com/redis/node-redis/blob/master/docs/clustering.md)).
   * When provided, the `url` and other client options are ignored.
   */
  cluster?: RedisClusterOptions;

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
   * Optionally provide the [`redis`](https://www.npmjs.com/package/redis) library
   * to avoid dynamically importing it.
   */
  lib?: LibImport<typeof import("redis")>;
}

export const DRIVER_DEPENDENCIES: DriverDependencies = {
  lib: { name: "redis", version: "^5 || ^6" },
};

const DRIVER_NAME = "node-redis";

type NodeRedisClient = RedisClientType | RedisClusterType;

type NodeRedisClients = {
  lib: typeof import("redis");
  client: NodeRedisClient;
  // Returns `Buffer`s instead of strings for (binary) raw values
  bufferClient: NodeRedisClient;
  connecting: Promise<unknown>;
};

// Default command timeout of redis v6 (redis v5 waits forever by default)
const DEFAULT_COMMAND_TIMEOUT = 5000;

const driver: DriverFactory<NodeRedisOptions, Promise<NodeRedisClient>> = (opts) => {
  let clients: Promise<NodeRedisClients> | undefined;
  let disposed = false;

  const initClients = () => {
    if (!clients) {
      const pending = (clients = createClients());
      // Retry on the next call if the client cannot be created or fails to connect
      pending
        .then(({ connecting }) => connecting)
        .catch(() => {
          if (clients === pending && !disposed) {
            clients = undefined;
          }
        });
    }
    return clients;
  };

  const getClients = async () => {
    const result = await initClients();
    // Like ioredis, a single client queues commands while connecting.
    // A cluster does not accept commands before it has discovered its nodes.
    if (opts.cluster) {
      await result.connecting;
      // A closed cluster does not reject commands itself
      if (!result.client.isOpen) {
        throw new result.lib.ClientClosedError();
      }
    }
    return result;
  };
  const getRedisClient = async () => (await getClients()).client;
  const getBufferClient = async () => (await getClients()).bufferClient;

  const createClients = async (): Promise<NodeRedisClients> => {
    const lib = await importLib(DRIVER_NAME, "redis", opts.lib);
    const {
      base: _base,
      cluster,
      ttl: _ttl,
      scanCount: _scanCount,
      preConnect: _preConnect,
      lib: _lib,
      ...clientOptions
    } = opts;

    // Unless configured otherwise, keep reconnecting with the default `retryStrategy` of ioredis
    // (node-redis gives up on socket timeouts by default, which closes the client for good)
    const withReconnectStrategy = <T extends Pick<RedisClientOptions, "socket">>(options: T): T =>
      options.socket?.reconnectStrategy === undefined
        ? {
            ...options,
            socket: {
              ...options.socket,
              reconnectStrategy: (retries: number) => Math.min((retries + 1) * 50, 2000),
            },
          }
        : options;

    // Time out commands like redis v6 does by default, also with redis v5
    const withCommandTimeout = <T extends Pick<RedisClientOptions, "commandOptions">>(
      options: T,
    ): T => ({
      ...options,
      commandOptions: { timeout: DEFAULT_COMMAND_TIMEOUT, ...options.commandOptions },
    });

    const client = (
      cluster
        ? lib.createCluster(
            withCommandTimeout({
              ...cluster,
              defaults: withReconnectStrategy(cluster.defaults ?? {}),
            }),
          )
        : lib.createClient(withCommandTimeout(withReconnectStrategy(clientOptions)))
    ) as NodeRedisClient;
    // node-redis throws on `error` events without a listener (e.g. while reconnecting).
    // Like ioredis, only log them if no other listener was added (e.g. using `getInstance()`).
    client.on("error", (error: unknown) => {
      if (client.listenerCount("error") <= 1) {
        console.error(`[unstorage] [${DRIVER_NAME}]`, error);
      }
    });

    return {
      lib,
      client,
      bufferClient: client.withTypeMapping({
        [lib.RESP_TYPES.BLOB_STRING]: Buffer,
      }) as NodeRedisClient,
      // Like a disconnected ioredis client, a client created after `dispose()` rejects all commands
      connecting: disposed ? Promise.resolve() : client.connect(),
    };
  };

  const base = (opts.base || "").replace(/:$/, "");
  const p = (...keys: string[]) => joinKeys(base, ...keys); // Prefix a key. Uses base for backwards compatibility
  const d = (key: string) => (base ? key.replace(`${base}:`, "") : key); // Deprefix a key
  const m = (base?: string) => {
    // Match all keys under base (escaped so it is not interpreted as a glob)
    const prefix = p(base || "");
    return prefix ? `${escapeRedisGlob(prefix)}:*` : "*";
  };

  const setOptions = (ttl: number | undefined): SetOptions | undefined =>
    ttl ? { expiration: { type: "EX", value: ttl } } : undefined;

  if (opts.preConnect) {
    getRedisClient().catch((error) => {
      console.error(error);
    });
  }

  const scan = async (pattern: string): Promise<string[]> => {
    const client = await getRedisClient();
    // In cluster mode, keys are spread across the master nodes, so each of them has to be scanned.
    const nodeClients: RedisClientType[] = opts.cluster
      ? await Promise.all(
          (client as RedisClusterType).masters.map(
            (master) => (client as RedisClusterType).nodeClient(master) as Promise<RedisClientType>,
          ),
        )
      : [client as RedisClientType];
    const keys = await Promise.all(
      nodeClients.map(async (nodeClient) => {
        const nodeKeys: string[] = [];
        for await (const scanKeys of nodeClient.scanIterator({
          MATCH: pattern,
          COUNT: opts.scanCount,
        })) {
          nodeKeys.push(...scanKeys);
        }
        return nodeKeys;
      }),
    );
    // SCAN may return a key multiple times
    return [...new Set(keys.flat())];
  };

  return {
    name: DRIVER_NAME,
    options: opts,
    getInstance: getRedisClient,
    async hasItem(key) {
      return Boolean(await (await getRedisClient()).exists(p(key)));
    },
    async getItem(key) {
      const value = await (await getRedisClient()).get(p(key));
      return value ?? null;
    },
    async getItemRaw(key: string) {
      const value = await (await getBufferClient()).get(p(key));
      return value ?? null;
    },
    async getItems(items) {
      if (items.length === 0) {
        return [];
      }
      const client = await getRedisClient();
      const keys = items.map((item) => p(item.key));

      // In cluster mode `MGET` requires all keys to hash to the same slot,
      // so send individual `GET` commands instead (they get auto-pipelined).
      const data = opts.cluster
        ? await Promise.all(keys.map((key) => client.get(key)))
        : await client.mGet(keys);

      return keys.map((key, index) => {
        return {
          key: d(key),
          value: data[index] ?? null,
        };
      });
    },
    async setItem(key, value, tOptions) {
      const ttl = tOptions?.ttl ?? opts.ttl;
      await (await getRedisClient()).set(p(key), value, setOptions(ttl));
    },
    async setItems(items, commonOptions) {
      if (items.length === 0) {
        return;
      }
      const client = await getRedisClient();
      const defaultTtl = commonOptions?.ttl ?? opts.ttl;
      const hasTtl = defaultTtl || items.some((item) => item.options?.ttl);

      // `MSET` cannot set a per-key TTL and requires all keys to hash to the same slot
      // in cluster mode. In those cases send individual `SET` commands (mirroring `setItem`),
      // which node-redis automatically pipelines; otherwise use a single `MSET`.
      if (hasTtl || opts.cluster) {
        await Promise.all(
          items.map((item) =>
            client.set(p(item.key), item.value, setOptions(item.options?.ttl ?? defaultTtl)),
          ),
        );
      } else {
        await client.mSet(items.map((item) => [p(item.key), item.value] as [string, string]));
      }
    },
    async setItemRaw(key, value, tOptions) {
      const ttl = tOptions?.ttl ?? opts.ttl;
      await (await getRedisClient()).set(p(key), normalizeValue(value), setOptions(ttl));
    },
    async removeItem(key) {
      await (await getRedisClient()).unlink(p(key));
    },
    async getKeys(base) {
      const keys = await scan(m(base));
      return keys.map((key) => d(key));
    },
    async clear(base) {
      const keys = await scan(m(base));
      if (keys.length === 0) {
        return;
      }
      const client = await getRedisClient();
      // In cluster mode multi-key commands require all keys to hash to the same slot.
      await (opts.cluster
        ? Promise.all(keys.map((key) => client.unlink(key)))
        : client.unlink(keys));
    },
    async dispose() {
      disposed = true;
      // Like ioredis' `disconnect()`, stop (re)connecting, reject pending commands and keep the
      // closed client, so that later calls are rejected instead of opening a new connection
      const client = (await initClients().catch(() => undefined))?.client;
      if (client?.isOpen) {
        // Destroying a client that is not ready yet emits an expected error, which is not logged
        client.on("error", () => {});
        await client.destroy();
      }
    },
  };
};

export default driver;
