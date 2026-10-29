import type { Storage, StorageValue } from "./types.ts";
import { normalizeBaseKey, normalizeKey } from "./utils.ts";

/**
 * Names of the tracing channels storage operations are published on.
 *
 * Subscribers can use them instead of hardcoding strings:
 * `TRACING_CHANNELS.map((name) => tracingChannel<TraceContext>(name))`.
 */
export const TRACING_CHANNELS = [
  "unstorage.hasItem",
  "unstorage.getItem",
  "unstorage.setItem",
  "unstorage.setItems",
  "unstorage.removeItem",
  "unstorage.getKeys",
  "unstorage.getItems",
  "unstorage.getItemRaw",
  "unstorage.setItemRaw",
  "unstorage.clear",
] as const;

export type TracingChannelName = (typeof TRACING_CHANNELS)[number];

type ChannelOperation = TracingChannelName extends `unstorage.${infer O}` ? O : never;

/**
 * All operations that can be traced.
 * Meta operations (setMeta, removeMeta, getMeta) use the underlying operation channels
 * with meta: true in the tracing data context.
 */
export type TracedOperation = ChannelOperation | "getMeta";

export interface TraceContext {
  keys: string[];
  /**
   * Whether this operation is working with metadata.
   * When true, the operation is accessing/modifying metadata (e.g., getMeta, setMeta).
   */
  meta?: boolean;
  /**
   * The mount point base path where this operation is being executed.
   * Useful for tracking which storage driver/mount is handling the operation.
   */
  base?: string;
  /**
   * Driver information for the operation.
   */
  driver?: {
    /**
     * The name of the driver handling this operation.
     */
    name?: string;
    /**
     * Driver-specific options.
     */
    options?: any;
  };
}

type MaybeTracedStorage<T extends StorageValue> = Storage<T> & {
  __traced?: boolean;
};

/**
 * Wraps a storage instance with tracing capabilities.
 * All storage operations will emit tracing events through Node.js diagnostics channels.
 */
export function withTracing<T extends StorageValue>(storage: MaybeTracedStorage<T>): Storage<T> {
  // Avoid wrapping already traced storages
  if (storage.__traced) {
    return storage;
  }

  const { tracingChannel } =
    globalThis.process.getBuiltinModule?.("node:diagnostics_channel") ?? {};
  if (!tracingChannel) {
    return storage;
  }

  type TracingConfig = {
    meta?: boolean;
    forceMeta?: boolean;
    base?: boolean;
    channel?: ChannelOperation;
  };

  // Map of operations to their tracing configuration
  // Operations without a channel of their own must be published on an existing one
  const operations: {
    [O in TracedOperation]: O extends ChannelOperation
      ? TracingConfig | undefined
      : TracingConfig & { channel: ChannelOperation };
  } = {
    getItem: { meta: true },
    getMeta: { forceMeta: true, channel: "getItem" },
    setItem: { meta: true },
    removeItem: { meta: true },
    getKeys: { base: true },
    clear: { base: true },
    hasItem: undefined,
    setItems: undefined,
    getItems: undefined,
    getItemRaw: undefined,
    setItemRaw: undefined,
  };

  const channels = Object.fromEntries(
    TRACING_CHANNELS.map((name) => [name, tracingChannel(name)] as const),
  );

  /**
   * Trace a promise with a given operation and data.
   */
  async function tracePromise<T>(
    operation: ChannelOperation,
    exec: () => Promise<T>,
    data: TraceContext,
  ): Promise<T> {
    const channel = channels[`unstorage.${operation}`];

    return channel ? channel.tracePromise(exec, data) : exec();
  }

  const tracedStorage: MaybeTracedStorage<T> = { ...storage, __traced: true };

  // Helper to get mount info for a key
  const getMountInfo = (key: string) => {
    const mount = storage.getMount(key);
    return {
      base: mount.base,
      driver: {
        name: mount.driver.name,
        options: mount.driver.options,
      },
    };
  };

  const prepKeys = (
    keyArg: Parameters<(typeof storage)[TracedOperation]>[0],
    operation: TracedOperation,
  ) => {
    if (!keyArg) return [];

    const getKeyValue = (i: string | { key: string }) => {
      const normalizer = operations[operation]?.base ? normalizeBaseKey : normalizeKey;

      return normalizer(typeof i === "string" ? i : i.key);
    };

    return Array.isArray(keyArg)
      ? keyArg.map((i) => getKeyValue(i))
      : // `Array.isArray` does not narrow out the readonly array accepted by `getItems`
        [getKeyValue(keyArg as string | { key: string })];
  };

  function wrapOperation<
    OP extends TracedOperation,
    M extends (...args: Parameters<(typeof storage)[OP]>) => ReturnType<(typeof storage)[OP]>,
  >(operation: OP) {
    return ((...args) => {
      const keys = prepKeys(args[0], operation);
      const isMeta =
        operations[operation]?.forceMeta ||
        (operations[operation]?.meta ? keys[0]?.endsWith("$") : undefined);
      const mountInfo = keys[0] ? getMountInfo(keys[0]) : undefined;

      return tracePromise(
        operations[operation]?.channel ?? (operation as ChannelOperation),
        () => (storage[operation] as any)(...args),
        {
          keys,
          meta: isMeta,
          ...mountInfo,
        },
      );
    }) as M;
  }

  for (const operation in operations) {
    tracedStorage[operation] = wrapOperation(operation as TracedOperation);
  }

  // Wrap aliases
  tracedStorage.has = tracedStorage.hasItem;
  tracedStorage.get = tracedStorage.getItem;
  tracedStorage.set = tracedStorage.setItem;
  tracedStorage.del = tracedStorage.removeItem;
  tracedStorage.remove = tracedStorage.removeItem;
  tracedStorage.keys = tracedStorage.getKeys;

  return tracedStorage;
}
