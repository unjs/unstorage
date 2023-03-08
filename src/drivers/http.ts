import { defineDriver } from "./utils";
import { $fetch } from "ofetch";
import { joinURL } from "ufo";

export interface HTTPOptions {
  base?: string;
}

export default defineDriver((opts: HTTPOptions = {}) => {
  const r = (key: string = "") => joinURL(opts.base!, key.replace(/:/g, "/"));
  const rBase = (key: string = "") =>
    joinURL(opts.base!, (key || "/").replace(/:/g, "/"), ":");

  return {
    name: "http",
    options: opts,
    hasItem(key) {
      return $fetch(r(key), { method: "HEAD" })
        .then(() => true)
        .catch(() => false);
    },
    async getItem(key) {
      const value = await $fetch(r(key));
      return value;
    },
    async getItemRaw(key) {
      const value = await $fetch(r(key), {
        headers: {
          accept: "application/octet-stream",
        },
      });
      return value;
    },
    async getMeta(key) {
      const res = await $fetch.raw(r(key), { method: "HEAD" });
      let mtime = undefined;
      const _lastModified = res.headers.get("last-modified");
      if (_lastModified) {
        mtime = new Date(_lastModified);
      }
      return {
        status: res.status,
        mtime,
      };
    },
    async setItem(key, value) {
      await $fetch(r(key), { method: "PUT", body: value });
    },
    async setItemRaw(key, value) {
      await $fetch(r(key), {
        method: "PUT",
        body: value,
        headers: {
          "content-type": "application/octet-stream",
        },
      });
    },
    async removeItem(key) {
      await $fetch(r(key), { method: "DELETE" });
    },
    async getKeys(base) {
      const value = await $fetch(rBase(base));
      return Array.isArray(value) ? value : [];
    },
    async clear(base) {
      await $fetch(rBase(base), { method: "DELETE" });
    },
  };
});
