import type * as CF from "@cloudflare/workers-types";
import { type DriverFactory, joinKeys } from "./utils/index.ts";
import { getR2Binding } from "./utils/cloudflare.ts";

export interface CloudflareR2Options {
  binding?: string | CF.R2Bucket;
  base?: string;
}

// https://developers.cloudflare.com/r2/api/workers/workers-api-reference/

const DRIVER_NAME = "cloudflare-r2-binding";

const driver: DriverFactory<CloudflareR2Options, CF.R2Bucket | Promise<CF.R2Bucket>> = (
  opts = {},
) => {
  const r = (key: string = "") => (opts.base ? joinKeys(opts.base, key) : key);

  const getKeys = async (base?: string) => {
    const binding = await getR2Binding(opts.binding);
    // Trailing `:` so that base `app` does not also match `apple:*`
    const prefix = joinKeys(opts.base || "", base || "");
    const keys: string[] = [];
    let cursor: string | undefined;
    // `list` returns at most 1000 objects per call, follow the cursor until done
    do {
      const page = await binding.list({
        ...(prefix ? { prefix: `${prefix}:` } : {}),
        cursor,
      });
      for (const obj of page.objects) keys.push(obj.key);
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
    return keys;
  };

  return {
    name: DRIVER_NAME,
    options: opts,
    getInstance: () => getR2Binding(opts.binding),
    async hasItem(key) {
      key = r(key);
      const binding = await getR2Binding(opts.binding);
      return (await binding.head(key)) !== null;
    },
    async getMeta(key) {
      key = r(key);
      const binding = await getR2Binding(opts.binding);
      const obj = await binding.head(key);
      if (!obj) return null;
      return {
        mtime: obj.uploaded,
        atime: obj.uploaded,
        ...obj,
      };
    },
    async getItem(key, topts) {
      key = r(key);
      const binding = await getR2Binding(opts.binding);
      return binding.get(key, topts).then((r) => r?.text() ?? null);
    },
    async getItemRaw(key, topts) {
      key = r(key);
      const binding = await getR2Binding(opts.binding);
      const object = await binding.get(key, topts);
      return object ? getObjBody(object as any, topts?.type) : null;
    },
    async setItem(key, value, topts) {
      key = r(key);
      const binding = await getR2Binding(opts.binding);
      await binding.put(key, value, topts);
    },
    async setItemRaw(key, value, topts) {
      key = r(key);
      const binding = await getR2Binding(opts.binding);
      await binding.put(key, value, topts);
    },
    async removeItem(key) {
      key = r(key);
      const binding = await getR2Binding(opts.binding);
      await binding.delete(key);
    },
    getKeys(base) {
      return getKeys(base).then((keys) =>
        opts.base ? keys.map((key) => key.slice(opts.base!.length)) : keys,
      );
    },
    async clear(base) {
      const binding = await getR2Binding(opts.binding);
      const keys = await getKeys(base);
      // `delete` accepts at most 1000 keys per call
      for (let i = 0; i < keys.length; i += 1000) {
        await binding.delete(keys.slice(i, i + 1000));
      }
    },
  };
};

function getObjBody(
  object: R2ObjectBody,
  type: "object" | "stream" | "blob" | "arrayBuffer" | "bytes",
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

export default driver;
