import type { KVNamespace, R2Bucket } from "@cloudflare/workers-types";
import { createError } from "./index.ts";

type Binding = KVNamespace | R2Bucket;

// Bindings passed as objects are typed structurally, with only the members the drivers
// call. The global `KVNamespace`/`R2Bucket` of `@cloudflare/workers-types` (what `env`
// holds in a Worker) are not assignable to the module ones once the DOM lib is loaded,
// because their `ReadableStream`/`Headers` then resolve to the DOM declarations.

/** A KV namespace binding, from the global or the module `@cloudflare/workers-types`. */
export interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; cursor?: string }): Promise<{
    keys: { name: string }[];
    list_complete: boolean;
    cursor?: string;
  }>;
}

/** An R2 bucket binding, from the global or the module `@cloudflare/workers-types`. */
export interface R2BucketLike {
  head(key: string): Promise<{ uploaded: Date } | null>;
  get(
    key: string,
    options?: any,
  ): Promise<{
    text(): Promise<string>;
    arrayBuffer(): Promise<ArrayBuffer>;
    // `ReadableStream`/`Blob` differ between the global and module types
    body: object;
    blob(): Promise<object>;
  } | null>;
  put(key: string, value: any, options?: any): Promise<unknown>;
  delete(keys: string | string[]): Promise<void>;
  list(options?: { prefix?: string }): Promise<{ objects: { key: string }[] }>;
}

let _env: Promise<Record<string, unknown> | undefined> | undefined;

/**
 * Lazily import `env` from the `cloudflare:workers` builtin module.
 *
 * Resolves to `undefined` outside of Cloudflare Workers.
 */
function importEnv(): Promise<Record<string, unknown> | undefined> {
  return (_env ??= import("cloudflare:workers").then(
    (m) => m.env as unknown as Record<string, unknown>,
    () => undefined,
  ));
}

export function getBinding<T extends Binding>(binding: T | string): T | Promise<T> {
  if (typeof binding !== "string") {
    return validateBinding(binding, "[binding]");
  }
  return importEnv().then((env) => validateBinding(env?.[binding] as T, binding));
}

function validateBinding<T extends Binding>(binding: T | undefined, bindingName: string): T {
  if (!binding) {
    throw createError("cloudflare", `Invalid binding \`${bindingName}\`: \`${binding}\``);
  }

  for (const key of ["get", "put", "delete"]) {
    if (!(key in binding)) {
      throw createError(
        "cloudflare",
        `Invalid binding \`${bindingName}\`: \`${key}\` key is missing`,
      );
    }
  }

  return binding;
}

export function getKVBinding(
  binding: KVNamespaceLike | string = "STORAGE",
): KVNamespace | Promise<KVNamespace> {
  return getBinding(binding as KVNamespace | string);
}

export function getR2Binding(
  binding: R2BucketLike | string = "BUCKET",
): R2Bucket | Promise<R2Bucket> {
  return getBinding(binding as R2Bucket | string);
}
