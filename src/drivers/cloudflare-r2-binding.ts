/// <reference types="@cloudflare/workers-types" />
import { getBinding } from "./utils/cloudflare";
import { defineDriver, joinKeys } from "./utils";

export interface CloudflareR2Options {
  binding?: string | R2Bucket;
  base?: string;
}

// https://developers.cloudflare.com/r2/api/workers/workers-api-reference/

const DRIVER_NAME = "cloudflare-r2-binding";

export default defineDriver(
  (opts: CloudflareR2Options = { binding: "BUCKET" }) => {
    const r = (key: string = "") =>
      opts.base ? joinKeys(opts.base, key) : key;

    const getKeys = async (base?: string) => {
      const binding = getBinding(opts.binding);
      const kvList = await binding.list(
        base || opts.base ? { prefix: r(base) } : undefined
      );
      return kvList.objects.map((obj) => obj.key);
    };

    return {
      name: DRIVER_NAME,
      options: opts,
      async hasItem(key) {
        key = r(key);
        const binding = getBinding(opts.binding);
        return (await binding.head(key)) !== null;
      },
      async getMeta(key, topts) {
        key = r(key);
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
        key = r(key);
        const binding = getBinding(opts.binding);
        return binding.get(key, topts).then((r) => r?.text());
      },
      getItemRaw(key, topts) {
        key = r(key);
        const binding = getBinding(opts.binding);
        return binding.get(key, topts).then((r) => r?.arrayBuffer());
      },
      async setItem(key, value, topts) {
        key = r(key);
        const binding = getBinding(opts.binding);
        await binding.put(key, value, topts);
      },
      async setItemRaw(key, value, topts) {
        key = r(key);
        const binding = getBinding(opts.binding);
        await binding.put(key, value, topts);
      },
      async removeItem(key) {
        key = r(key);
        const binding = getBinding(opts.binding);
        await binding.delete(key);
      },
      getKeys(base) {
        return getKeys(base).then((keys) =>
          opts.base ? keys.map((key) => key.slice(opts.base!.length)) : keys
        );
      },
      async clear(base) {
        const binding = getBinding(opts.binding);
        const keys = await getKeys(base);
        await binding.delete(keys);
      },
    };
  }
);
