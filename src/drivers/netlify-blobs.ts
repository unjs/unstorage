import {
  createError,
  createRequiredError,
  type DriverFactory,
  importLib,
  type LibImport,
  type DriverDependencies,
} from "./utils/index.ts";
import { CASMismatchError } from "./utils/cas.ts";
import type { GetKeysOptions } from "../types.ts";
import type {
  Store,
  BlobResponseType,
  // NOTE: this type is different in v10+ vs. pre-v10
  SetOptions,
  ListOptions,
  GetStoreOptions,
  GetDeployStoreOptions,
} from "@netlify/blobs";

export const DRIVER_DEPENDENCIES: DriverDependencies = {
  lib: {
    name: "@netlify/blobs",
    version: "^6.5.0 || ^7.0.0 || ^8.1.0 || ^9.0.0 || ^10.0.0 || ^11.0.0",
  },
};

const DRIVER_NAME = "netlify-blobs";

type GetOptions = { type?: BlobResponseType };

export type NetlifyStoreOptions =
  | NetlifyDeployStoreLegacyOptions
  | NetlifyDeployStoreOptions
  | NetlifyNamedStoreOptions;

export interface ExtraOptions {
  /** If set to `true`, the store is scoped to the deploy. This means that it is only available from that deploy, and will be deleted or rolled-back alongside it. */
  deployScoped?: boolean;

  /**
   * Optionally provide the [`@netlify/blobs`](https://www.npmjs.com/package/@netlify/blobs) library
   * to avoid dynamically importing it.
   */
  lib?: LibImport<typeof import("@netlify/blobs")>;
}

export interface NetlifyDeployStoreOptions extends GetDeployStoreOptions, ExtraOptions {
  name?: never;
  deployScoped: true;
}

export interface NetlifyDeployStoreLegacyOptions extends NetlifyDeployStoreOptions {
  // Added in v8.0.0. This ensures TS compatibility for older versions.
  region?: never;
}

export interface NetlifyNamedStoreOptions extends GetStoreOptions, ExtraOptions {
  name: string;
  deployScoped?: false;
}

const driver: DriverFactory<NetlifyStoreOptions, Promise<Store>> = (options) => {
  const { deployScoped, name, lib, ...opts } = options;
  let store: Promise<Store> | undefined;

  const getClient = () =>
    (store ??= (async () => {
      const { getStore, getDeployStore } = await importLib(
        DRIVER_NAME,
        "@netlify/blobs",
        lib,
        () => import("@netlify/blobs"),
      );
      if (deployScoped) {
        if (name) {
          throw createError(DRIVER_NAME, "deploy-scoped stores cannot have a name");
        }
        return getDeployStore({ fetch, ...opts });
      }
      if (!name) {
        throw createRequiredError(DRIVER_NAME, "name");
      }
      // Ensures that reserved characters are encoded
      return getStore({ name: encodeURIComponent(name), fetch, ...opts });
    })());

  // Native conditional write. Maps `ifMatch:<etag>` to `onlyIfMatch` and
  // `ifNoneMatch:"*"` to `onlyIfNew`. The remaining shapes (`ifMatch:"*"` and
  // `ifNoneMatch:<etag>`) are emulated by reading current metadata then
  // submitting an etag-pinned `onlyIfMatch` write so the precondition is still
  // checked atomically server-side. Throws CASMismatchError on failure.
  const setWithCAS = async (
    key: string,
    value: string | ArrayBuffer | Blob,
    opts: { ifMatch?: string; ifNoneMatch?: string } | undefined,
  ): Promise<{ etag: string }> => {
    const client = await getClient();
    const ifMatch = opts?.ifMatch;
    const ifNoneMatch = opts?.ifNoneMatch;

    // Native fast paths.
    if (ifNoneMatch === "*" && ifMatch === undefined) {
      const r = await client.set(key, value as any, { onlyIfNew: true });
      if (!r.modified) throw new CASMismatchError(DRIVER_NAME, key);
      return { etag: r.etag ?? "" };
    }
    if (ifMatch !== undefined && ifMatch !== "*" && ifNoneMatch === undefined) {
      const r = await client.set(key, value as any, { onlyIfMatch: ifMatch });
      if (!r.modified) throw new CASMismatchError(DRIVER_NAME, key);
      return { etag: r.etag ?? "" };
    }

    // Emulated paths: derive an etag-pinned write from the current metadata.
    const meta = await client.getMetadata(key);
    const exists = meta !== null;
    const curEtag = meta?.etag;

    if (ifNoneMatch === "*" && exists) throw new CASMismatchError(DRIVER_NAME, key);
    if (ifNoneMatch !== undefined && ifNoneMatch !== "*" && exists && curEtag === ifNoneMatch) {
      throw new CASMismatchError(DRIVER_NAME, key);
    }
    if (ifMatch === "*" && !exists) throw new CASMismatchError(DRIVER_NAME, key);
    if (ifMatch !== undefined && ifMatch !== "*" && (!exists || curEtag !== ifMatch)) {
      throw new CASMismatchError(DRIVER_NAME, key);
    }

    const setOpts: SetOptions = exists
      ? ({ onlyIfMatch: curEtag } as SetOptions)
      : ({ onlyIfNew: true } as SetOptions);
    const r = await client.set(key, value as any, setOpts);
    if (!r.modified) throw new CASMismatchError(DRIVER_NAME, key);
    return { etag: r.etag ?? "" };
  };

  return {
    name: DRIVER_NAME,
    flags: { cas: true },
    options,
    getInstance: getClient,
    async hasItem(key) {
      return (await getClient()).getMetadata(key).then(Boolean);
    },
    getItem: async (key, tops?: GetOptions) => {
      // @ts-expect-error has trouble with the overloaded types
      return (await getClient()).get(key, tops);
    },
    async getMeta(key) {
      const m = await (await getClient()).getMetadata(key);
      return m ? { ...m.metadata, etag: m.etag } : null;
    },
    async getItemRaw(key, topts?: GetOptions) {
      // @ts-expect-error has trouble with the overloaded types
      return (await getClient()).get(key, { type: topts?.type ?? "arrayBuffer" });
    },
    async setItem(key, value, topts?: SetOptions & { ifMatch?: string; ifNoneMatch?: string }) {
      if (topts?.ifMatch !== undefined || topts?.ifNoneMatch !== undefined) {
        return setWithCAS(key, value, topts);
      }
      // NOTE: this returns either Promise<void> (pre-v10) or Promise<WriteResult> (v10+)
      // TODO(serhalp): Allow drivers to return a value from `setItem`. The @netlify/blobs v10
      // functionality isn't usable without this.
      await (await getClient()).set(key, value, topts);
    },
    async setItemRaw(
      key,
      value: string | ArrayBuffer | Blob,
      topts?: SetOptions & { ifMatch?: string; ifNoneMatch?: string },
    ) {
      if (topts?.ifMatch !== undefined || topts?.ifNoneMatch !== undefined) {
        return setWithCAS(key, value, topts);
      }
      // NOTE: this returns either Promise<void> (pre-v10) or Promise<WriteResult> (v10+)
      // See TODO above.
      await (await getClient()).set(key, value, topts);
    },
    async removeItem(key) {
      return (await getClient()).delete(key);
    },
    async getKeys(base?: string, tops?: GetKeysOptions & Omit<ListOptions, "prefix" | "paginate">) {
      return (await (await getClient()).list({ ...tops, prefix: base })).blobs.map(
        (item) => item.key,
      );
    },
    async clear(base?: string) {
      const client = await getClient();
      return Promise.allSettled(
        (await client.list({ prefix: base })).blobs.map((item) => client.delete(item.key)),
      ).then(() => {});
    },
  };
};

export default driver;
