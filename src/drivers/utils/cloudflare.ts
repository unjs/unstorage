import type { KVNamespace, R2Bucket } from "@cloudflare/workers-types";
import { createError } from "./index.ts";

type Binding = KVNamespace | R2Bucket;

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
  binding: KVNamespace | string = "STORAGE",
): KVNamespace | Promise<KVNamespace> {
  return getBinding(binding);
}

export function getR2Binding(binding: R2Bucket | string = "BUCKET"): R2Bucket | Promise<R2Bucket> {
  return getBinding(binding);
}
