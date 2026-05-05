import type * as CF from "@cloudflare/workers-types";
import { type DriverFactory, joinKeys } from "./utils/index.ts";
import { getR2Binding } from "./utils/cloudflare.ts";
import { CASMismatchError } from "./utils/cas.ts";

export interface CloudflareR2Options {
  binding?: string | CF.R2Bucket;
  base?: string;
}

// https://developers.cloudflare.com/r2/api/workers/workers-api-reference/

const DRIVER_NAME = "cloudflare-r2-binding";

const driver: DriverFactory<CloudflareR2Options, CF.R2Bucket> = (opts = {}) => {
  const r = (key: string = "") => (opts.base ? joinKeys(opts.base, key) : key);

  const getKeys = async (base?: string) => {
    const binding = getR2Binding(opts.binding);
    const kvList = await binding.list(base || opts.base ? { prefix: r(base) } : undefined);
    return kvList.objects.map((obj) => obj.key);
  };

  const buildPutOpts = (
    topts: (CF.R2PutOptions & { ifMatch?: string; ifNoneMatch?: string }) | undefined,
  ): CF.R2PutOptions | undefined => {
    if (!topts) return undefined;
    const { ifMatch, ifNoneMatch, ...rest } = topts;
    if (ifMatch === undefined && ifNoneMatch === undefined) {
      return rest as CF.R2PutOptions;
    }
    // R2 accepts `"*"` as a wildcard etag for both etagMatches / etagDoesNotMatch.
    const onlyIf: CF.R2Conditional = {};
    if (ifNoneMatch !== undefined) onlyIf.etagDoesNotMatch = ifNoneMatch;
    if (ifMatch !== undefined) onlyIf.etagMatches = ifMatch;
    return { ...(rest as CF.R2PutOptions), onlyIf };
  };

  return {
    name: DRIVER_NAME,
    options: opts,
    flags: { cas: true },
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
        etag: obj.etag,
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
      return object ? getObjBody(object as any, topts?.type) : null;
    },
    async setItem(key, value, topts) {
      key = r(key);
      const binding = getR2Binding(opts.binding);
      const wantsCAS = topts?.ifMatch !== undefined || topts?.ifNoneMatch !== undefined;
      const result = await binding.put(key, value, buildPutOpts(topts) as any);
      if (wantsCAS && result === null) {
        throw new CASMismatchError(DRIVER_NAME, key);
      }
      return wantsCAS ? { etag: result!.etag } : undefined;
    },
    async setItemRaw(key, value, topts) {
      key = r(key);
      const binding = getR2Binding(opts.binding);
      const wantsCAS = topts?.ifMatch !== undefined || topts?.ifNoneMatch !== undefined;
      const result = await binding.put(key, value, buildPutOpts(topts) as any);
      if (wantsCAS && result === null) {
        throw new CASMismatchError(DRIVER_NAME, key);
      }
      return wantsCAS ? { etag: result!.etag } : undefined;
    },
    async removeItem(key) {
      key = r(key);
      const binding = getR2Binding(opts.binding);
      await binding.delete(key);
    },
    getKeys(base) {
      return getKeys(base).then((keys) =>
        opts.base ? keys.map((key) => key.slice(opts.base!.length)) : keys,
      );
    },
    async clear(base) {
      const binding = getR2Binding(opts.binding);
      const keys = await getKeys(base);
      await binding.delete(keys);
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
