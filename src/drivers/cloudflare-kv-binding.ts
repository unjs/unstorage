/// <reference types="@cloudflare/workers-types" />
import { defineDriver } from "./utils";
export interface KVOptions {
  binding?: string | KVNamespace;
}

// https://developers.cloudflare.com/workers/runtime-apis/kv

export default defineDriver((opts: KVOptions = {}) => {
  async function getKeys(base?: string) {
    const binding = getBinding(opts.binding);
    const kvList = await binding.list(base ? { prefix: base } : undefined);
    return kvList.keys.map((key) => key.name);
  }

  return {
    name: "cloudflare-kv-binding",
    options: opts,
    async hasItem(key) {
      const binding = getBinding(opts.binding);
      return (await binding.get(key)) !== undefined;
    },
    getItem(key) {
      const binding = getBinding(opts.binding);
      return binding.get(key);
    },
    setItem(key, value) {
      const binding = getBinding(opts.binding);
      return binding.put(key, value);
    },
    removeItem(key) {
      const binding = getBinding(opts.binding);
      return binding.delete(key);
    },
    // TODO: use this.getKeys once core is fixed
    getKeys,
    async clear() {
      const binding = getBinding(opts.binding);
      const keys = await getKeys();
      await Promise.all(keys.map((key) => binding.delete(key)));
    },
  };
});

function getBinding(binding: KVNamespace | string = "STORAGE") {
  let bindingName = "[binding]";

  if (typeof binding === "string") {
    bindingName = binding;
    binding = (globalThis[bindingName] ||
      globalThis.__env__?.[bindingName]) as KVNamespace;
  }

  if (!binding) {
    throw new Error(
      `Invalid Cloudflare KV binding '${bindingName}': ${binding}`
    );
  }

  for (const key of ["get", "put", "delete"]) {
    if (!(key in binding)) {
      throw new Error(
        `Invalid Cloudflare KV binding '${bindingName}': '${key}' key is missing`
      );
    }
  }

  return binding;
}
