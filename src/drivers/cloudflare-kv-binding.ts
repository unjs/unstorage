/// <reference types="@cloudflare/workers-types" />
import { defineDriver, joinKeys } from "./utils";
import { getKVBinding } from "./utils/cloudflare";
import { TransactionOptions } from "../types";
export interface KVOptions {
  binding?: string | KVNamespace;

  /** Adds prefix to all stored keys */
  base?: string;
}

// https://developers.cloudflare.com/workers/runtime-apis/kv

const DRIVER_NAME = "cloudflare-kv-binding";

export default defineDriver((opts: KVOptions) => {
  const r = (key: string = "") => (opts.base ? joinKeys(opts.base, key) : key);

  async function getKeys(base: string = "") {
    base = r(base);
    const binding = getKVBinding(opts.binding);
    const keys = [];
    let cursor: string | undefined = undefined;
    do {
      const kvList = await binding.list({ prefix: base || undefined, cursor });

      keys.push(...kvList.keys);
      cursor = (kvList.list_complete ? undefined : kvList.cursor) as
        | string
        | undefined;
    } while (cursor);

    return keys.map((key) => key.name);
  }

  return {
    name: DRIVER_NAME,
    options: opts,
    getInstance: () => getKVBinding(opts.binding),
    async hasItem(key) {
      key = r(key);
      const binding = getKVBinding(opts.binding);
      return (await binding.get(key)) !== null;
    },
    getItem(key) {
      key = r(key);
      const binding = getKVBinding(opts.binding);
      return binding.get(key);
    },
    setItem(key, value, topts) {
      key = r(key);
<<<<<<< HEAD
      const expirationOpts: TransactionOptions = {};
      if (topts.ttl) {
        expirationOpts.expirationTtl = topts.ttl;
      }
=======
>>>>>>> 4fa6e3e (update)
      const binding = getKVBinding(opts.binding);
      return binding.put(key, value, topts ? {
        expirationTtl: topts.ttl,
        ...topts
      } : undefined);
    },
    removeItem(key) {
      key = r(key);
      const binding = getKVBinding(opts.binding);
      return binding.delete(key);
    },
    getKeys() {
      return getKeys().then((keys) =>
        keys.map((key) => (opts.base ? key.slice(opts.base.length) : key))
      );
    },
    async clear(base) {
      const binding = getKVBinding(opts.binding);
      const keys = await getKeys(base);
      await Promise.all(keys.map((key) => binding.delete(key)));
    },
  };
});
