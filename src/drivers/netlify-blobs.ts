import {
  createError,
  createRequiredError,
  defineDriver,
} from "./utils/index.ts";
import type { DriverFactory } from "./utils/index.ts";
import type { GetKeysOptions } from "../types.ts";
import { getStore, getDeployStore } from "@netlify/blobs";
import type {
  Store,
  BlobResponseType,
  // NOTE: this type is different in v10+ vs. pre-v10
  SetOptions,
  ListOptions,
  GetStoreOptions,
  GetDeployStoreOptions,
} from "@netlify/blobs";

const DRIVER_NAME = "netlify-blobs";

type GetOptions = { type?: BlobResponseType };

export type NetlifyStoreOptions =
  | NetlifyDeployStoreLegacyOptions
  | NetlifyDeployStoreOptions
  | NetlifyNamedStoreOptions;

export interface ExtraOptions {
  /** If set to `true`, the store is scoped to the deploy. This means that it is only available from that deploy, and will be deleted or rolled-back alongside it. */
  deployScoped?: boolean;
}

export interface NetlifyDeployStoreOptions
  extends GetDeployStoreOptions,
    ExtraOptions {
  name?: never;
  deployScoped: true;
}

export interface NetlifyDeployStoreLegacyOptions
  extends NetlifyDeployStoreOptions {
  // Added in v8.0.0. This ensures TS compatibility for older versions.
  region?: never;
}

export interface NetlifyNamedStoreOptions
  extends GetStoreOptions,
    ExtraOptions {
  name: string;
  deployScoped?: false;
}

const driver: DriverFactory<NetlifyStoreOptions, Store> = defineDriver(
  (options: NetlifyStoreOptions) => {
    const { deployScoped, name, ...opts } = options;
    let store: Store;

    const getClient = () => {
      if (!store) {
        if (deployScoped) {
          if (name) {
            throw createError(
              DRIVER_NAME,
              "deploy-scoped stores cannot have a name"
            );
          }
          store = getDeployStore({ fetch, ...options });
        } else {
          if (!name) {
            throw createRequiredError(DRIVER_NAME, "name");
          }
          // Ensures that reserved characters are encoded
          store = getStore({ name: encodeURIComponent(name), fetch, ...opts });
        }
      }
      return store;
    };

    return {
      name: DRIVER_NAME,
      options,
      getInstance: getClient,
      async hasItem(key) {
        return getClient().getMetadata(key).then(Boolean);
      },
      getItem: (key, tops?: GetOptions) => {
        // @ts-expect-error has trouble with the overloaded types
        return getClient().get(key, tops);
      },
      getMeta(key) {
        return getClient().getMetadata(key);
      },
      getItemRaw(key, topts?: GetOptions) {
        // @ts-expect-error has trouble with the overloaded types
        return getClient().get(key, { type: topts?.type ?? "arrayBuffer" });
      },
      async setItem(key, value, topts?: SetOptions) {
        // NOTE: this returns either Promise<void> (pre-v10) or Promise<WriteResult> (v10+)
        // TODO(serhalp): Allow drivers to return a value from `setItem`. The @netlify/blobs v10
        // functionality isn't usable without this.
        await getClient().set(key, value, topts);
      },
      async setItemRaw(
        key,
        value: string | ArrayBuffer | Blob,
        topts?: SetOptions
      ) {
        // NOTE: this returns either Promise<void> (pre-v10) or Promise<WriteResult> (v10+)
        // See TODO above.
        await getClient().set(key, value, topts);
      },
      removeItem(key) {
        return getClient().delete(key);
      },
      async getKeys(
        base?: string,
        tops?: GetKeysOptions & Omit<ListOptions, "prefix" | "paginate">
      ) {
        return (await getClient().list({ ...tops, prefix: base })).blobs.map(
          (item) => item.key
        );
      },
      async clear(base?: string) {
        const client = getClient();
        return Promise.allSettled(
          (await client.list({ prefix: base })).blobs.map((item) =>
            client.delete(item.key)
          )
        ).then(() => {});
      },
    };
  }
);

export default driver;
