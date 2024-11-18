import { defineDriver } from "./utils";
import { $fetch as _fetch } from "ofetch";
import { joinURL } from "ufo";

export interface myJsonOptions {
  collectionId: string;
  accessToken: string;
  headers?: Record<string, string>;
}

const RECORDS_BASE_URL = "https://api.myjson.online/v1/records";
const DRIVER_NAME = "http";

export default defineDriver((opts: myJsonOptions) => {
  const r = (key: string = "") =>
    joinURL(RECORDS_BASE_URL, key.replace(/:/g, "/"));

  opts.headers ??= {};
  opts.headers["x-collection-access-token"] = opts.accessToken;

  return {
    name: DRIVER_NAME,
    options: opts,
    async hasItem(key, topts) {
      return _fetch(r(key), {
        method: "HEAD",
        headers: { ...opts.headers, ...topts.headers },
        redirect: "follow",
      })
        .then(() => true)
        .catch(() => false);
    },
    async getItem(key, tops = {}) {
      return await _fetch(r(key), {
        headers: {
          ...opts.headers,
          ...tops.headers,
          "Content-Type": "application/json",
        },
        redirect: "follow",
      });
    },
    async getItemRaw(key, topts) {
      return await _fetch(r(key), {
        headers: {
          accept: "application/octet-stream",
          ...opts.headers,
          ...topts.headers,
        },
        redirect: "follow",
      });
    },
    async setItem(key, value, topts: { patch?: true }) {
      let method = "POST";
      const urlencoded = new URLSearchParams();

      urlencoded.append("jsonData", value);
      urlencoded.append("collectionId", opts.collectionId);

      if (topts.patch) {
        method = "PATCH";
        urlencoded.append("jsonData", value);
      } else if (this.hasItem(key, opts)) {
        method = "PUT";
        urlencoded.append("jsonData", value);
      }

      return await _fetch(r(key), {
        method,
        headers: { ...opts.headers, "Content-Type": "x-www-form-urlencoded" },
        body: urlencoded,
        redirect: "follow",
      });
    },
    async setItems(items, topts) {
      await Promise.all(
        items.map(
          (item) =>
            this.setItem && this.setItem(item.key, item.value, topts || {})
        )
      );
    },
    async removeItem(key, topts) {
      await _fetch(r(key), {
        method: "DELETE",
        headers: { ...opts.headers, ...topts.headers },
        redirect: "follow",
      });
    },
    async getKeys(collectionId, topts) {
      const url = `https://api.myjson.online/v1/collections/${
        collectionId || opts.collectionId
      }/records`;

      const value = await _fetch(url, {
        headers: { ...opts.headers, ...topts.headers },
        redirect: "follow",
      });

      return Array.isArray(value) ? value : [];
    },
    async clear(base, topts) {
      const keys = await this.getKeys(base || opts.collectionId, topts);

      await Promise.all(
        keys.map((key) => this.removeItem && this.removeItem(key, topts))
      );
    },
  };
});
