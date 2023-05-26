/// <reference types="@cloudflare/workers-types" />
import { createError, defineDriver } from "./utils";

export interface CloudflareR2Options {
  binding: string | R2Bucket;
}

// https://developers.cloudflare.com/r2/api/workers/workers-api-reference/

const DRIVER_NAME = "cloudflare-r2-binding";

export default defineDriver((opts: CloudflareR2Options) => {
  const getKeys = async (base?: string) => {
    const binding = getBinding(opts.binding);
    const kvList = await binding.list(base ? { prefix: base } : undefined);
    return kvList.objects.map((obj) => obj.key);
  };

  return {
    name: DRIVER_NAME,
    options: opts,
    async hasItem(key) {
      const binding = getBinding(opts.binding);
      return (await binding.head(key)) !== null;
    },
    async getMeta(key, opts) {
      const binding = getBinding(opts.binding);
      const obj = await binding.head(key);
      if (!obj) return null;
      return {
        mtime: obj.uploaded,
        atime: obj.uploaded,
        ...obj,
      };
    },
    getItem(key, topts) {
      const binding = getBinding(opts.binding);
      return binding.get(key, topts).then((r) => r.text());
    },
    getItemRaw(key, topts) {
      const binding = getBinding(opts.binding);
      return binding.get(key, topts).then((r) => r.arrayBuffer());
    },
    async setItem(key, value, topts) {
      const binding = getBinding(opts.binding);
      await binding.put(key, value, topts);
    },
    async setItemRaw(key, value, topts) {
      const binding = getBinding(opts.binding);
      await binding.put(key, value, topts);
    },
    async removeItem(key) {
      const binding = getBinding(opts.binding);
      await binding.delete(key);
    },
    getKeys(base) {
      return getKeys(base);
    },
    async clear(base) {
      const binding = getBinding(opts.binding);
      const keys = await getKeys(base);
      await binding.delete(keys);
    },
  };
});

function getBinding(binding: R2Bucket | string) {
  let bindingName = "[binding]";

  if (typeof binding === "string") {
    bindingName = binding;
    binding = (globalThis[bindingName] ||
      globalThis.__env__?.[bindingName]) as R2Bucket;
  }

  if (!binding) {
    throw createError(
      DRIVER_NAME,
      `Invalid binding \`${bindingName}\`: \`${binding}\``
    );
  }

  for (const key of ["get", "put", "delete"]) {
    if (!(key in binding)) {
      throw createError(
        DRIVER_NAME,
        `Invalid binding \`${bindingName}\`: \`${key}\` key is missing`
      );
    }
  }

  return binding;
}
