import {
  type DriverFactory,
  importLib,
  type LibImport,
  normalizeKey,
  joinKeys,
  type DriverDependencies,
} from "./utils/index.ts";
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

  /**
   * Optionally provide the [`@vercel/functions`](https://www.npmjs.com/package/@vercel/functions)
   * library to avoid dynamically importing it.
   *
   * Only used as a fallback when the runtime cache is not exposed via the Vercel request context.
   */
  lib?: LibImport<typeof import("@vercel/functions")>;
}

export const DRIVER_DEPENDENCIES: DriverDependencies = {
  lib: { name: "@vercel/functions", version: "^2.2.12 || ^3.0.0", optional: true },
};

const DRIVER_NAME = "vercel-runtime-cache";

const driver: DriverFactory<VercelCacheOptions, Promise<RuntimeCache>> = (opts) => {
  const base = normalizeKey(opts?.base);
  const r = (...keys: string[]) => joinKeys(base, ...keys);

  let _cache: Promise<RuntimeCache> | undefined;

  const getClient = () => (_cache ??= getCache(opts));

  return {
    name: DRIVER_NAME,
    getInstance: getClient,
    async hasItem(key) {
      const value = await (await getClient()).get(r(key));
      return value !== undefined && value !== null;
    },
    async getItem(key) {
      const value = await (await getClient()).get(r(key));
      return value === undefined ? null : value;
    },
    async setItem(key, value, tOptions) {
      const ttl = tOptions?.ttl ?? opts?.ttl;
      const tags = [...(tOptions?.tags || []), ...(opts?.tags || [])].filter(Boolean);

      await (
        await getClient()
      ).set(r(key), value, {
        ttl,
        tags,
      });
    },
    async removeItem(key) {
      await (await getClient()).delete(r(key));
    },
    async getKeys(_base) {
      // Runtime Cache doesn't provide a way to list keys
      return [];
    },
    async clear(_base) {
      // Runtime Cache doesn't provide a way to clear all keys
      // You can only expire by tags
      if (opts?.tags && opts.tags.length > 0) {
        await (await getClient()).expireTag(opts.tags);
      }
    },
  };
};

// --- internal ---

// Derived from Apache 2.0 licensed code:
// https://github.com/vercel/vercel/blob/main/packages/functions/src/cache
// Copyright 2017 Vercel, Inc.

type Context = { cache?: RuntimeCache };

const SYMBOL_FOR_REQ_CONTEXT = /*#__PURE__*/ Symbol.for("@vercel/request-context");

function getContext(): Context {
  const fromSymbol: typeof globalThis & {
    [SYMBOL_FOR_REQ_CONTEXT]?: { get?: () => Context };
  } = globalThis;
  return fromSymbol[SYMBOL_FOR_REQ_CONTEXT]?.get?.() ?? {};
}

async function getCache(opts: VercelCacheOptions): Promise<RuntimeCache> {
  const cache =
    getContext()?.cache ||
    (
      await importLib(
        DRIVER_NAME,
        "@vercel/functions",
        opts?.lib,
        () => import("@vercel/functions"),
      )
    ).getCache?.({
      keyHashFunction: (key) => key,
      namespaceSeparator: ":",
    });
  if (!cache) {
    throw new Error("Runtime cache is not available!");
  }
  return cache;
}

export default driver;
