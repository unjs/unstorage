import { type DriverFactory, normalizeKey, joinKeys } from "./utils/index.ts";
import type { RuntimeCache } from "@vercel/functions";

export interface VercelCacheOptions {
  /**
   * Optional prefix to use for all keys. Can be used for namespacing.
   */
  base?: string;

  /**
   * Default TTL for all items in seconds.
   */
  ttl?: number;

  /**
   * Default tags to apply to all cache entries.
   */
  tags?: string[];
}

const DRIVER_NAME = "vercel-runtime-cache";

const driver: DriverFactory<VercelCacheOptions, RuntimeCache> = (opts) => {
  const base = normalizeKey(opts?.base);
  const r = (...keys: string[]) => joinKeys(base, ...keys);

  let _cache: RuntimeCache;

  const getClient = () => {
    if (!_cache) {
      _cache = getCache();
    }
    return _cache;
  };

  return {
    name: DRIVER_NAME,
    getInstance: getClient,
    async hasItem(key) {
      const value = await getClient().get(r(key));
      return value !== undefined && value !== null;
    },
    async getItem(key) {
      const value = await getClient().get(r(key));
      return value === undefined ? null : value;
    },
    async setItem(key, value, tOptions) {
      const ttl = tOptions?.ttl ?? opts?.ttl;
      const tags = [...(tOptions?.tags || []), ...(opts?.tags || [])].filter(
        Boolean
      );

      await getClient().set(r(key), value, {
        ttl,
        tags,
      });
    },
    async removeItem(key) {
      await getClient().delete(r(key));
    },
    async getKeys(_base) {
      // Runtime Cache doesn't provide a way to list keys
      return [];
    },
    async clear(_base) {
      // Runtime Cache doesn't provide a way to clear all keys
      // You can only expire by tags
      if (opts?.tags && opts.tags.length > 0) {
        await getClient().expireTag(opts.tags);
      }
    },
  };
};

// --- internal ---

// Derived from Apache 2.0 licensed code:
// https://github.com/vercel/vercel/blob/main/packages/functions/src/cache
// Copyright 2017 Vercel, Inc.

type Context = { cache?: RuntimeCache };

const SYMBOL_FOR_REQ_CONTEXT = /*#__PURE__*/ Symbol.for(
  "@vercel/request-context"
);

function getContext(): Context {
  const fromSymbol: typeof globalThis & {
    [SYMBOL_FOR_REQ_CONTEXT]?: { get?: () => Context };
  } = globalThis;
  return fromSymbol[SYMBOL_FOR_REQ_CONTEXT]?.get?.() ?? {};
}

function getCache(): RuntimeCache {
  const cache =
    getContext()?.cache ||
    tryRequireVCFunctions()?.getCache?.({
      keyHashFunction: (key) => key,
      namespaceSeparator: ":",
    });
  if (!cache) {
    throw new Error("Runtime cache is not available!");
  }
  return cache;
}

let _vcFunctionsLib: typeof import("@vercel/functions") | undefined;

function tryRequireVCFunctions() {
  if (!_vcFunctionsLib) {
    const { createRequire } =
      globalThis.process?.getBuiltinModule?.("node:module") || {};
    _vcFunctionsLib = createRequire?.(import.meta.url)("@vercel/functions");
  }
  return _vcFunctionsLib;
}

export default driver;
