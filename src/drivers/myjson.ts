import { defineDriver, createError } from "./utils";

// Docs: https://docs.myjson.online/endpoints/records

export interface MyJsonOptions {
  /**
   * The access token to use for all operations.
   *
   * `MYJSON_ACCESS_TOKEN` environment variable will be used if not provided.
   */
  accessToken?: string;

  /**
   * The collection ID to use for all operations.
   *
   * `MYJSON_COLLECTION_ID` environment variable will be used if not provided.
   *
   */
  collectionId?: string;
}

const DRIVER_NAME = "myjson";

const RECORDS_BASE_URL = "https://api.myjson.online/v1/records/";
const COLLECTIONS_BASE_URL = "https://api.myjson.online/v1/collections/";

export default defineDriver((opts: MyJsonOptions) => {
  const r = (key: string = "", collections?: boolean) =>
    (collections ? COLLECTIONS_BASE_URL : RECORDS_BASE_URL) +
    key.replace(/:/g, "/");

  const accessToken =
    opts.accessToken || globalThis.process?.env?.MYJSON_ACCESS_TOKEN;

  const collectionId =
    opts.collectionId || globalThis.process?.env?.MYJSON_COLLECTION_ID;

  if (!accessToken || !collectionId) {
    throw createError(
      DRIVER_NAME,
      "Missing required options: `accessToken`, `collectionId`"
    );
  }

  const myjsonFetch = (url: string, init: RequestInit) => {
    console.log("fetching", url);
    return fetch(url, {
      ...init,
      headers: {
        "x-collection-access-token": accessToken,
        ...init.headers,
      },
    });
  };

  const getKeys = (base: string) => {
    return myjsonFetch(r(base, true /* collections */), {
      redirect: "follow",
    }).then((res) => res.json() as Promise<string[]>);
  };

  return {
    name: DRIVER_NAME,
    options: opts,
    async getKeys(base) {
      return getKeys(base);
    },
    async hasItem(key) {
      const response = await myjsonFetch(r(key), {
        method: "HEAD",
        redirect: "follow",
      });
      return response.ok;
    },
    async getItem(key) {
      const response = await myjsonFetch(r(key), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        redirect: "follow",
      });
      return response.text();
    },
    async getItemRaw(key) {
      const response = await myjsonFetch(r(key), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        redirect: "follow",
      });
      return response.arrayBuffer();
    },
    async setItem(key, value) {
      const urlencoded = new URLSearchParams();
      urlencoded.append("jsonData", value);
      urlencoded.append("collectionId", collectionId);
      await myjsonFetch(r(key), {
        method: "POST",
        headers: { "Content-Type": "x-www-form-urlencoded" },
        body: urlencoded,
        redirect: "follow",
      });
    },
    async removeItem(key) {
      await myjsonFetch(r(key), {
        method: "DELETE",
        redirect: "follow",
      });
    },
    async clear(base) {
      const keys = await getKeys(base);
      await Promise.all(
        keys.map((key) =>
          myjsonFetch(r(key), {
            method: "DELETE",
            redirect: "follow",
          })
        )
      );
    },
  };
});
