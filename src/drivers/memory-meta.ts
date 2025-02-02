import type { TransactionOptions, StorageMeta } from "../types";
import { defineDriver, joinKeys } from "./utils";

type MaybePromise<T> = T | Promise<T>;

export interface MemoryOptions {
  /**
   * Optional prefix to use for all keys. Can be used for namespacing.
   */
  base?: string;

  /**
   * Default Time-to-live for items in milliseconds.
   */
  ttl?: number;

  /**
   * Whether to automatically purge expired items.
   * @default true
   */
  ttlAutoPurge?: boolean;

  /**
   * Whether to track the size of items in bytes.
   * @default false
   */
  trackSize?: boolean;
}

export interface MemoryDriver {
  data: any;
  meta?: {
    ttl?: number;
    atime?: number; // Access Time
    mtime?: number; // Modified Time
    ctime?: number; // Change Time
    birthtime?: number; // Creation Time
    size?: number; // Size in bytes (optional)
    timeoutId?: NodeJS.Timeout; // Track timeout for auto-purge
  };
}

export interface MemoryDriverMeta extends StorageMeta {
  ttl?: number;
  atime?: Date;
  mtime?: Date;
  ctime?: Date;
  birthtime?: Date;
  size?: number;
}

export interface MemoryDriverInstance {
  getInstance: () => Map<string, MemoryDriver>;
  options: MemoryOptions;
  has: (key: string) => boolean;
  hasItem: (key: string) => boolean;
  get: (key: string) => any;
  getItem: (key: string) => any;
  getItemRaw: (key: string) => any;
  set: (key: string, value: any, tOpts?: TransactionOptions) => void;
  setItem: (key: string, value: any, tOpts?: TransactionOptions) => void;
  setItemRaw: (key: string, value: any, tOpts?: TransactionOptions) => void;
  del: (key: string) => void;
  remove: (key: string) => void;
  removeItem: (key: string) => void;
  keys: () => string[];
  getKeys: () => string[];
  getMeta: (key: string) => MaybePromise<MemoryDriverMeta | null>;
  clear: () => void;
  dispose: () => void;
}

const DRIVER_NAME = "memory-meta";

export default defineDriver((opts: MemoryOptions) => {
  const data = new Map<string, MemoryDriver>();

  const base = (opts.base || "").replace(/:$/, "");
  const p = (...keys: string[]) => joinKeys(base, ...keys);
  const d = (key: string) => (base ? key.replace(base, "") : key);

  function _get(key: string) {
    const item = data.get(p(key));
    if (item) {
      item.meta ||= {};
      item.meta.atime = Date.now();
    }
    return item?.data ?? null;
  }
  function _set(key: string, value: any, tOpts?: TransactionOptions) {
    const now = Date.now();
    const ttl: number | undefined = tOpts?.ttl || opts.ttl;
    const pKey = p(key);
    const existing = data.get(pKey);
    const meta = {
      ...existing?.meta,
      mtime: now,
      ctime: now,
      birthtime: existing?.meta?.birthtime || now,
    };

    if (opts.trackSize) {
      meta.size = _calculateSize(value);
    }

    if (opts.ttlAutoPurge !== false && ttl) {
      if (existing?.meta?.timeoutId) {
        clearTimeout(existing.meta.timeoutId);
      }

      meta.ttl = now + ttl;
      data.set(pKey, { data: value, meta });
      meta.timeoutId = setTimeout(() => data.delete(pKey), ttl);
    } else {
      data.set(pKey, { data: value, meta });
    }
  }
  function _removeItem(key: string) {
    const pKey = p(key);
    const existing = data.get(pKey);
    if (existing?.meta?.timeoutId) clearTimeout(existing.meta.timeoutId);
    data.delete(pKey);
  }
  function _calculateSize(value: any): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === "string") return value.length;
    if (typeof value === "number") return 8;
    if (typeof value === "boolean") return 4;
    if (value instanceof Buffer || value instanceof Uint8Array)
      return value.byteLength;
    if (value instanceof Blob) return value.size;
    // Warning for potentially expensive operations
    if (value instanceof Object && Object.keys(value).length > 1000) {
      console.warn(
        `[${DRIVER_NAME}] Large object detected, size calculation may impact performance`
      );
    }
    return JSON.stringify(value).length;
  }

  return <MemoryDriverInstance>{
    name: DRIVER_NAME,
    options: opts,
    getInstance: () => data,
    has(key) {
      return data.has(p(key));
    },
    hasItem(key) {
      return data.has(p(key));
    },
    get: (key) => _get(key),
    getItem: (key) => _get(key),
    getItemRaw: (key) => _get(key),
    set: (key, value, tOpts) => _set(key, value, tOpts),
    setItem: (key, value, tOpts) => _set(key, value, tOpts),
    setItemRaw: (key, value, tOpts) => _set(key, value, tOpts),
    del: (key) => _removeItem(key),
    remove: (key) => _removeItem(key),
    removeItem: (key) => _removeItem(key),
    keys() {
      return [...data.keys()].map((element) => d(element));
    },
    getKeys() {
      return [...data.keys()].map((element) => d(element));
    },
    getMeta(key): MaybePromise<MemoryDriverMeta | null> {
      const item = data.get(p(key))?.meta;
      if (!item) return null;

      return {
        ttl: item.ttl ? item.ttl - Date.now() : undefined,
        atime: item.atime ? new Date(item.atime) : undefined,
        mtime: item.mtime ? new Date(item.mtime) : undefined,
        ctime: item.ctime ? new Date(item.ctime) : undefined,
        birthtime: item.birthtime ? new Date(item.birthtime) : undefined,
        size: item.size,
      };
    },
    clear() {
      for (const [key, item] of data) {
        if (key.startsWith(base)) {
          if (item.meta?.timeoutId) clearTimeout(item.meta.timeoutId);
          data.delete(key);
        }
      }
    },
    dispose() {
      // Clear all timeouts
      for (const [_, item] of data) {
        if (item.meta?.timeoutId) {
          clearTimeout(item.meta.timeoutId);
        }
      }
      data.clear();
    },
  };
});
