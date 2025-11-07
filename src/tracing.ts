import { TracingChannel, tracingChannel } from "node:diagnostics_channel";
import type { Storage, StorageValue } from "./types.ts";
import { normalizeBaseKey, normalizeKey } from "./utils.ts";

/**
 * All operations that can be traced.
 * Meta operations (setMeta, removeMeta, getMeta) use the underlying operation channels
 * with meta: true in the tracing data context.
 */
export type TracedOperation =
  | "hasItem"
  | "getItem"
  | "setItem"
  | "setItems"
  | "removeItem"
  | "getKeys"
  | "getItems"
  | "getItemRaw"
  | "setItemRaw"
  | "clear";

const channels: Record<TracedOperation, TracingChannel> = {
  hasItem: createChannel("hasItem"),
  getItem: createChannel("getItem"),
  setItem: createChannel("setItem"),
  setItems: createChannel("setItems"),
  removeItem: createChannel("removeItem"),
  getKeys: createChannel("getKeys"),
  getItems: createChannel("getItems"),
  getItemRaw: createChannel("getItemRaw"),
  setItemRaw: createChannel("setItemRaw"),
  clear: createChannel("clear"),
};

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

/**
 * Create a tracing channel for a given operation.
 */
function createChannel(operation: TracedOperation): TracingChannel {
  return tracingChannel(`unstorage.${operation}`);
}

/**
 * Trace a promise with a given operation and data.
 */
export async function tracePromise<T>(
  operation: TracedOperation,
  exec: () => Promise<T>,
  data: TraceContext
): Promise<T> {
  const channel = channels[operation];

  return channel.tracePromise(exec, data);
}

/**
 * Wraps a storage instance with tracing capabilities.
 * All storage operations will emit tracing events through Node.js diagnostics channels.
 */
export function withTracing<T extends StorageValue>(
  storage: Storage<T>
): Storage<T> {
  const tracedStorage: Storage<T> = { ...storage };

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

  // Wrap hasItem
  tracedStorage.hasItem = (key, opts) => {
    key = normalizeKey(key);
    const mountInfo = getMountInfo(key);

    return tracePromise("hasItem", () => storage.hasItem(key, opts), {
      keys: [key],
      ...mountInfo,
    });
  };

  // Wrap getItem
  tracedStorage.getItem = (key, opts) => {
    key = normalizeKey(key);
    const isMeta = key.endsWith("$");
    const mountInfo = getMountInfo(key);

    return tracePromise("getItem", () => storage.getItem(key, opts), {
      keys: [key],
      meta: isMeta,
      ...mountInfo,
    });
  };

  // Wrap getItemRaw
  tracedStorage.getItemRaw = (key, opts) => {
    key = normalizeKey(key);
    const mountInfo = getMountInfo(key);

    return tracePromise("getItemRaw", () => storage.getItemRaw(key, opts), {
      keys: [key],
      ...mountInfo,
    });
  };

  // Wrap setItem
  tracedStorage.setItem = (key, value, opts) => {
    key = normalizeKey(key);
    const isMeta = key.endsWith("$");
    const mountInfo = getMountInfo(key);

    return tracePromise("setItem", () => storage.setItem(key, value, opts), {
      keys: [key],
      meta: isMeta,
      ...mountInfo,
    });
  };

  // Wrap setItemRaw
  tracedStorage.setItemRaw = (key, value, opts) => {
    key = normalizeKey(key);
    const mountInfo = getMountInfo(key);

    return tracePromise(
      "setItemRaw",
      () => storage.setItemRaw(key, value, opts),
      { keys: [key], ...mountInfo }
    );
  };

  // Wrap removeItem
  tracedStorage.removeItem = (key, opts) => {
    key = normalizeKey(key);
    const isMeta = key.endsWith("$");
    const mountInfo = getMountInfo(key);

    return tracePromise("removeItem", () => storage.removeItem(key, opts), {
      keys: [key],
      meta: isMeta,
      ...mountInfo,
    });
  };

  // Wrap getMeta (uses getItem channel)
  tracedStorage.getMeta = (key, opts) => {
    key = normalizeKey(key);
    const mountInfo = getMountInfo(key);

    return tracePromise(
      "getItem",
      () => Promise.resolve(storage.getMeta(key, opts)),
      {
        keys: [key],
        meta: true,
        ...mountInfo,
      }
    );
  };

  // Wrap getKeys (can span multiple mounts, no driver info)
  tracedStorage.getKeys = (base, opts) => {
    base = normalizeBaseKey(base);

    return tracePromise("getKeys", () => storage.getKeys(base, opts), {
      keys: [base],
      base,
    });
  };

  // Wrap clear (can span multiple mounts, no driver info)
  tracedStorage.clear = (base, opts) => {
    base = normalizeBaseKey(base);

    return tracePromise("clear", () => storage.clear(base, opts), {
      keys: [base],
      base,
    });
  };

  // Wrap getItems (batch operation, can span multiple mounts)
  tracedStorage.getItems = (items, commonOptions) => {
    const keys = items.map((item) =>
      normalizeKey(typeof item === "string" ? item : item.key)
    );

    return tracePromise(
      "getItems",
      () => storage.getItems(items, commonOptions),
      { keys }
    );
  };

  // Wrap setItems (batch operation, can span multiple mounts)
  tracedStorage.setItems = (items, commonOptions) => {
    const keys = items.map((item) =>
      normalizeKey(typeof item === "string" ? item : item.key)
    );
    return tracePromise(
      "setItems",
      () => storage.setItems(items, commonOptions),
      { keys }
    );
  };

  // Wrap aliases
  tracedStorage.has = tracedStorage.hasItem;
  tracedStorage.get = tracedStorage.getItem;
  tracedStorage.set = tracedStorage.setItem;
  tracedStorage.del = tracedStorage.removeItem;
  tracedStorage.remove = tracedStorage.removeItem;
  tracedStorage.keys = tracedStorage.getKeys;

  return tracedStorage;
}
