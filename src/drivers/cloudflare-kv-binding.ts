/// <reference types="@cloudflare/workers-types" />
import { getBinding } from "./utils/cloudflare";
import { defineDriver, joinKeys } from "./utils";

export interface KVOptions {
  binding?: string | KVNamespace;

  /** Adds prefix to all stored keys */
  base?: string;
}

// https://developers.cloudflare.com/workers/runtime-apis/kv

const DRIVER_NAME = "cloudflare-kv-binding";

export default defineDriver((opts: KVOptions = { binding: 'STORAGE' }) => {
  const r = (key: string = "") => (opts.base ? joinKeys(opts.base, key) : key);

  async function getKeys(base: string = "") {
    base = r(base);
    const binding = getBinding(opts.binding);
    const kvList = await binding.list(base ? { prefix: base } : undefined);
    return kvList.keys.map((key) => key.name);
  }

  return {
    name: DRIVER_NAME,
    options: opts,
    async hasItem(key) {
      key = r(key);
      const binding = getBinding(opts.binding);
      return (await binding.get(key)) !== null;
    },
    getItem(key) {
      key = r(key);
      const binding = getBinding(opts.binding);
      return binding.get(key);
    },
    setItem(key, value) {
      key = r(key);
      const binding = getBinding(opts.binding);
      return binding.put(key, value);
    },
    removeItem(key) {
      key = r(key);
      const binding = getBinding(opts.binding);
      return binding.delete(key);
    },
    getKeys() {
      return getKeys().then((keys) =>
        keys.map((key) => (opts.base ? key.slice(opts.base.length) : key))
      );
    },
    async clear(base) {
      const binding = getBinding(opts.binding);
      const keys = await getKeys(base);
      await Promise.all(keys.map((key) => binding.delete(key)));
    },
  };
});

