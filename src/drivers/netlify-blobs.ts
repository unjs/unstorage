import { createError, createRequiredError, defineDriver } from "./utils";
import { getStore, getDeployStore } from "@netlify/blobs";
import { fetch } from "ofetch";

type Store = ReturnType<typeof getStore>;

const DRIVER_NAME = "netlify-blobs";

interface NetlifyBaseStoreOptions {
  deployScoped?: boolean;
  name?: string;
  apiURL?: string;
  edgeURL?: string;
  siteID?: string;
  token?: string;
}

interface NetlifyDeployStoreOptions extends NetlifyBaseStoreOptions {
  deployScoped: true;
  name?: never;
  deployID?: string;
}

interface NetlifyNamedStoreOptions extends NetlifyBaseStoreOptions {
  deployScoped?: false;
  name: string;
}

export type NetlifyStoreOptions =
  | NetlifyDeployStoreOptions
  | NetlifyNamedStoreOptions;

type GetOptions = {
  type?: "text" | "json" | "arrayBuffer" | "stream" | "blob";
};

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
        return getClient().get(key).then(Boolean);
      },
      getItem: (key) => {
        return getClient().get(key);
      },
      getItemRaw(key, opts: GetOptions) {
        // @ts-expect-error has trouble with the overloaded types
        return getClient().get(key, { type: opts?.type ?? "text" });
      },
      setItem(key, value) {
        return getClient().set(key, value);
      },
      setItemRaw(
        key,
        value: string | ArrayBuffer | Blob,
        opts?: { metadata?: any }
      ) {
        return getClient().set(key, value, opts);
      },
      removeItem(key) {
        return getClient().delete(key);
      },
      async getKeys(base?: string) {
        return (await getClient().list({ prefix: base })).blobs.map(
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
