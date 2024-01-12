/// <reference types="@cloudflare/workers-types" />
import { createError } from "./index";

export function getBinding(binding: KVNamespace | R2Bucket | string) {
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
