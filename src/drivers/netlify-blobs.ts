import { createError, createRequiredError, defineDriver } from "./utils";
import { getStore, getDeployStore } from "@netlify/blobs";
import type {
  Store,
  BlobResponseType,
  SetOptions,
  ListOptions,
} from "@netlify/blobs";
import { fetch } from "ofetch";

const DRIVER_NAME = "netlify-blobs";

type GetOptions = { type?: BlobResponseType };

export interface NetlifyBaseStoreOptions {
  /** The name of the store to use. It is created if needed. This is required except for deploy-scoped stores. */
  name?: string;
  /** If set to `true`, the store is scoped to the deploy. This means that it is only available from that deploy, and will be deleted or rolled-back alongside it. */
  deployScoped?: boolean;
  /** Required during builds, where it is available as `constants.SITE_ID`. At runtime this is set automatically. */
  siteID?: string;
  /** Required during builds, where it is available as `constants.NETLIFY_API_TOKEN`. At runtime this is set automatically. */
  token?: string;
  /** Used for advanced use cases and unit tests */
  apiURL?: string;
  /** Used for advanced use cases and unit tests */
  edgeURL?: string;
}

export interface NetlifyDeployStoreOptions extends NetlifyBaseStoreOptions {
  name?: never;
  deployScoped: true;
  deployID?: string;
}

export interface NetlifyNamedStoreOptions extends NetlifyBaseStoreOptions {
  name: string;
  deployScoped?: false;
}

export type NetlifyStoreOptions =
  | NetlifyDeployStoreOptions
  | NetlifyNamedStoreOptions;

export default defineDriver(
  ({ deployScoped, name, ...opts }: NetlifyStoreOptions) => {
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
          store = getDeployStore({ fetch, ...opts });
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
      options: {},
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
        return getClient().get(key, { type: topts?.type ?? "text" });
      },
      setItem(key, value, topts?: SetOptions) {
        return getClient().set(key, value, topts);
      },
      setItemRaw(key, value: string | ArrayBuffer | Blob, topts?: SetOptions) {
        return getClient().set(key, value, topts);
      },
      removeItem(key) {
        return getClient().delete(key);
      },
      async getKeys(
        base?: string,
        tops?: Omit<ListOptions, "prefix" | "paginate">
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
