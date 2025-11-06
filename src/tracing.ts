import { TracingChannel, tracingChannel } from "node:diagnostics_channel";

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
