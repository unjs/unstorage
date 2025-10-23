/// <reference types="@cloudflare/workers-types" />
import { createError } from "./index.ts";

export function getBinding(
  binding: KVNamespace | R2Bucket | string
): KVNamespace | R2Bucket {
  let bindingName = "[binding]";

  if (typeof binding === "string") {
    bindingName = binding;
    binding = ((globalThis as any)[bindingName] ||
      (globalThis as any).__env__?.[bindingName]) as KVNamespace | R2Bucket;
  }

  if (!binding) {
    throw createError(
      "cloudflare",
      `Invalid binding \`${bindingName}\`: \`${binding}\``
    );
  }

  for (const key of ["get", "put", "delete"]) {
    if (!(key in binding)) {
      throw createError(
        "cloudflare",
        `Invalid binding \`${bindingName}\`: \`${key}\` key is missing`
      );
    }
  }

  return binding;
}

export function getKVBinding(binding: KVNamespace | string = "STORAGE") {
  return getBinding(binding) as KVNamespace;
}

export function getR2Binding(binding: R2Bucket | string = "BUCKET") {
  return getBinding(binding) as R2Bucket;
}
