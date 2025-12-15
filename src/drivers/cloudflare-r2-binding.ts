/// <reference types="@cloudflare/workers-types" />
import { defineDriver, joinKeys } from "./utils/index.ts";
import { getR2Binding } from "./utils/cloudflare.ts";

export interface CloudflareR2Options {
  binding?: string | R2Bucket;
  base?: string;
}

// https://developers.cloudflare.com/r2/api/workers/workers-api-reference/

const DRIVER_NAME = "cloudflare-r2-binding";

export default defineDriver((opts: CloudflareR2Options = {}) => {
  const r = (key: string = "") => (opts.base ? joinKeys(opts.base, key) : key);

  const getKeys = async (base?: string) => {
    const binding = getR2Binding(opts.binding);
    const kvList = await binding.list(
      base || opts.base ? { prefix: r(base) } : undefined
    );
    return kvList.objects.map((obj) => obj.key);
  };

  return {
    name: DRIVER_NAME,
    options: opts,
    getInstance: () => getR2Binding(opts.binding),
    async hasItem(key) {
      key = r(key);
      const binding = getR2Binding(opts.binding);
      return (await binding.head(key)) !== null;
    },
    async getMeta(key) {
      key = r(key);
      const binding = getR2Binding(opts.binding);
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
      const binding = getR2Binding(opts.binding);
      return binding.get(key, topts).then((r) => r?.text() ?? null);
    },
    async getItemRaw(key, topts) {
      key = r(key);
      const binding = getR2Binding(opts.binding);
      const object = await binding.get(key, topts);
      return object ? getObjBody(object, topts?.type) : null;
    },
    async setItem(key, value, topts) {
      key = r(key);
      const binding = getR2Binding(opts.binding);
      await binding.put(key, value, topts);
    },
    async setItemRaw(key, value, topts) {
      key = r(key);
      const binding = getR2Binding(opts.binding);
      await binding.put(key, value, topts);
    },
    async removeItem(key) {
      key = r(key);
      const binding = getR2Binding(opts.binding);
      await binding.delete(key);
    },
    getKeys(base) {
      return getKeys(base).then((keys) =>
        opts.base ? keys.map((key) => key.slice(opts.base!.length)) : keys
      );
    },
    async clear(base) {
      const binding = getR2Binding(opts.binding);
      const keys = await getKeys(base);
      await binding.delete(keys);
    },
  };
});

function getObjBody(
  object: R2ObjectBody,
  type: "object" | "stream" | "blob" | "arrayBuffer" | "bytes"
) {
  switch (type) {
    case "object": {
      return object;
    }
    case "stream": {
      return object.body;
    }
    case "blob": {
      return object.blob();
    }
    case "arrayBuffer": {
      return object.arrayBuffer();
    }
    case "bytes": {
      return object.arrayBuffer().then((buffer) => new Uint8Array(buffer));
    }
    // TODO: Default to bytes in v2
    default: {
      return object.arrayBuffer();
    }
  }
}
