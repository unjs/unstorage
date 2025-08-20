import { defineDriver, normalizeKey, joinKeys } from "./utils";
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

  // --- advanced: passed as CacheOptions ---

  /**
   * Optional custom hash function for generating keys.
   */
  keyHashFunction?: (key: string) => string;

  /**
   * Optional namespace to prefix cache keys.
   */
  namespace?: string;

  /**
   * Optional separator string for the namespace.
   */
  namespaceSeparator?: string;
}

const DRIVER_NAME = "vercel-runtime-cache";

export default defineDriver<VercelCacheOptions, RuntimeCache>((opts) => {
  const base = normalizeKey(opts?.base);
  const r = (...keys: string[]) => joinKeys(base, ...keys);

  let _cache: any;

  const getClient = () => {
    if (!_cache) {
      _cache = getCache({
        namespace: opts?.namespace,
        namespaceSeparator: opts?.namespaceSeparator,
        keyHashFunction: opts?.keyHashFunction,
      })!;
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
      const tags = tOptions?.tags ?? opts?.tags; // TODO: Should we merge instead?

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
});

// --- internal ---

// Derived from Apache 2.0 licensed code:
// https://github.com/vercel/vercel/blob/main/packages/functions/src/cache
// Copyright 2017 Vercel, Inc.

type Context = {
  waitUntil?: (promise: Promise<unknown>) => void;
  cache?: RuntimeCache;
  headers?: Record<string, string>;
};

interface CacheOptions {
  keyHashFunction?: (key: string) => string;
  namespace?: string;
  namespaceSeparator?: string;
}

const SYMBOL_FOR_REQ_CONTEXT = /*#__PURE__*/ Symbol.for(
  "@vercel/request-context"
);

function getContext(): Context {
  const fromSymbol: typeof globalThis & {
    [SYMBOL_FOR_REQ_CONTEXT]?: { get?: () => Context };
  } = globalThis;
  return fromSymbol[SYMBOL_FOR_REQ_CONTEXT]?.get?.() ?? {};
}

function getCache(cacheOptions?: CacheOptions): RuntimeCache | undefined {
  const resolveCache = () => {
    const cache =
      getContext()?.cache || tryRequireVCFunctions()?.getCache?.(cacheOptions);
    if (!cache) {
      throw new Error("Runtime cache is not available!");
    }
    return cache;
  };
  return wrapWithKeyTransformation(
    resolveCache,
    createKeyTransformer(cacheOptions)
  );
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

function wrapWithKeyTransformation(
  resolveCache: () => RuntimeCache,
  makeKey: (key: string) => string
): RuntimeCache {
  return {
    get: (key: string) => {
      return resolveCache().get(makeKey(key));
    },
    set: (
      key: string,
      value: unknown,
      options?: { name?: string; tags?: string[]; ttl?: number }
    ) => {
      return resolveCache().set(makeKey(key), value, options);
    },
    delete: (key: string) => {
      return resolveCache().delete(makeKey(key));
    },
    expireTag: (tag: string | string[]) => {
      return resolveCache().expireTag(tag);
    },
  };
}

function createKeyTransformer(
  cacheOptions?: CacheOptions
): (key: string) => string {
  const hashFunction = cacheOptions?.keyHashFunction || djb2Hash;

  return (key: string) => {
    if (!cacheOptions?.namespace) return hashFunction(key);
    const separator = cacheOptions.namespaceSeparator || "$";
    return `${cacheOptions.namespace}${separator}${hashFunction(key)}`;
  };
}

function djb2Hash(key: string) {
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    // eslint-disable-next-line unicorn/prefer-code-point
    hash = (hash * 33) ^ key.charCodeAt(i);
  }
  return (hash >>> 0).toString(16); // Convert the hash to a string
}
