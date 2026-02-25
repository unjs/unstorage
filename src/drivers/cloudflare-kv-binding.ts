/// <reference types="@cloudflare/workers-types" />
import { type DriverFactory, joinKeys } from "./utils/index.ts";
import { getKVBinding } from "./utils/cloudflare.ts";
export interface KVOptions {
  binding?: string | KVNamespace;

  /** Adds prefix to all stored keys */
  base?: string;

  /**
   * The minimum time-to-live (ttl) for setItem in seconds.
   * The default is 60 seconds as per Cloudflare's [documentation](https://developers.cloudflare.com/kv/api/write-key-value-pairs/).
   */
  minTTL?: number;
}

// https://developers.cloudflare.com/workers/runtime-apis/kv

const DRIVER_NAME = "cloudflare-kv-binding";

const driver: DriverFactory<KVOptions> = ((opts) => {
  const r = (key: string = "") => (opts.base ? joinKeys(opts.base, key) : key);

  async function getKeys(base: string = "") {
    base = r(base);
    const binding = getKVBinding(opts.binding);
    const keys: { name: string }[] = [];
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
      const binding = getKVBinding(opts.binding);
      return binding.put(
        key,
        value,
        topts
          ? {
              expirationTtl: topts?.ttl
                ? Math.max(topts.ttl, opts.minTTL ?? 60)
                : undefined,
              ...topts,
            }
          : undefined
      );
    },
    removeItem(key) {
      key = r(key);
      const binding = getKVBinding(opts.binding);
      return binding.delete(key);
    },
    getKeys(base) {
      return getKeys(base).then((keys) =>
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


export default driver;
