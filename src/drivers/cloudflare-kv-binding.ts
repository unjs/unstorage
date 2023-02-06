/// <reference types="@cloudflare/workers-types" />
import { defineDriver } from "./utils";
export interface KVOptions {
  binding?: string | KVNamespace;
}

// https://developers.cloudflare.com/workers/runtime-apis/kv

export default defineDriver((opts: KVOptions = {}) => {
  const binding = getBinding(opts.binding);

  async function getKeys(base?: string) {
    const kvList = await binding.list(base ? { prefix: base } : undefined);
    return kvList.keys.map((key) => key.name);
  }

  return {
    async hasItem(key) {
      return (await binding.get(key)) !== null;
    },
    getItem(key) {
      return binding.get(key);
    },
    setItem(key, value) {
      return binding.put(key, value);
    },
    removeItem(key) {
      return binding.delete(key);
    },
    // TODO: use this.getKeys once core is fixed
    getKeys,
    async clear() {
      const keys = await getKeys();
      await Promise.all(keys.map((key) => binding.delete(key)));
    },
  };
});

function getBinding(binding: KVNamespace | string = "STORAGE") {
  let bindingName = "[binding]";

  if (typeof binding === "string") {
    bindingName = binding;
    binding = (globalThis as any)[bindingName] as KVNamespace;
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
