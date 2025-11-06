import { TracingChannel, tracingChannel } from "node:diagnostics_channel";
import type { Driver } from "./types.ts";
import { normalizeBaseKey, normalizeKey } from "./utils.ts";

/**
 * All operations that can be traced.
 * Meta operations (setMeta, removeMeta, getMeta) use the underlying operation channels
 * with meta: true in the tracing data context.
 */
export type TracingOperation =
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

const channels: Record<TracingOperation, TracingChannel> = {
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

export interface UnstorageTracingData {
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
function createChannel(operation: TracingOperation): TracingChannel {
  return tracingChannel(`unstorage.${operation}`);
}

/**
 * Trace a promise with a given operation and data.
 */
export async function tracePromise<T>(
  operation: TracingOperation,
  exec: () => Promise<T>,
  data: UnstorageTracingData
): Promise<T> {
  const channel = channels[operation];

  return channel.tracePromise(exec, data);
}

interface TracerInit {
  getMount: (key: string) => {
    base: string;
    relativeKey: string;
    driver: Driver;
  };
}

/**
 * Create a tracer object with helper functions to wrap operations with tracing.
 */
export function createTracer({ getMount }: TracerInit) {
  /**
   * Helper to wrap single-key operations with tracing
   * Note: single-key operations can only span one mount,
   * so driver info is included as there is only one driver involved
   */
  const withTrace = <T>(
    operation: TracingOperation,
    key: string,
    fn: (mount: ReturnType<typeof getMount>) => Promise<T>,
    extraData?: { meta?: boolean }
  ) => {
    key = normalizeKey(key);
    const mount = getMount(key);

    return tracePromise(operation, () => fn(mount), {
      keys: [key],
      base: mount.base,
      driver: {
        name: mount.driver.name,
        options: mount.driver.options,
      },
      ...extraData,
    });
  };

  /**
   * Helper to wrap base-path operations with tracing
   * Note: base operations (getKeys, clear) can span multiple mounts,
   * so driver info is not included as there may be multiple drivers involved
   */
  const withBaseTrace = <T>(
    operation: TracingOperation,
    base: string | undefined,
    fn: () => Promise<T>
  ) => {
    base = normalizeBaseKey(base);

    return tracePromise(operation, fn, { keys: [base], base });
  };

  /**
   * Helper to wrap batch operations (getItems, setItems) with tracing
   * Note: batch operations can span multiple mounts,
   * so driver info is not included as there may be multiple drivers involved
   */
  const withBatchTrace = <T>(
    operation: TracingOperation,
    items: (string | { key: string; [key: string]: any })[],
    fn: () => Promise<T>
  ) => {
    const keys = items.map((item) =>
      normalizeKey(typeof item === "string" ? item : item.key)
    );

    return tracePromise(operation, fn, { keys });
  };

  return {
    withTrace,
    withBaseTrace,
    withBatchTrace,
  };
}
