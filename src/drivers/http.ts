import { defineDriver } from "./utils";
import { type FetchError, $fetch as _fetch } from "ofetch";
import { joinURL } from "ufo";

export interface HTTPOptions {
  base: string;
  headers?: Record<string, string>;
}

const DRIVER_NAME = "http";

export default defineDriver((opts: HTTPOptions) => {
  const r = (key: string = "") => joinURL(opts.base!, key.replace(/:/g, "/"));

  const rBase = (key: string = "") =>
    joinURL(opts.base!, (key || "/").replace(/:/g, "/"), ":");

  const catchFetchError = (error: FetchError, fallbackVal: any = null) => {
    if (error?.response?.status === 404) {
      return fallbackVal;
    }
    throw error;
  };

  return {
    name: DRIVER_NAME,
    options: opts,
    hasItem(key, topts) {
      return _fetch(r(key), {
        method: "HEAD",
        headers: { ...opts.headers, ...topts.headers },
      })
        .then(() => true)
        .catch((err) => catchFetchError(err, false));
    },
    async getItem(key, tops = {}) {
      const value = await _fetch(r(key), {
        headers: { ...opts.headers, ...tops.headers },
      }).catch(catchFetchError);
      return value;
    },
    async getItemRaw(key, topts) {
      const value = await _fetch(r(key), {
        headers: {
          accept: "application/octet-stream",
          ...opts.headers,
          ...topts.headers,
        },
      }).catch(catchFetchError);
      return value;
    },
    async getMeta(key, topts) {
      const res = await _fetch.raw(r(key), {
        method: "HEAD",
        headers: { ...opts.headers, ...topts.headers },
      });
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
    async setItem(key, value, topts) {
      await _fetch(r(key), {
        method: "PUT",
        body: value,
        headers: { ...opts.headers, ...topts?.headers },
      });
    },
    async setItemRaw(key, value, topts) {
      await _fetch(r(key), {
        method: "PUT",
        body: value,
        headers: {
          "content-type": "application/octet-stream",
          ...opts.headers,
          ...topts.headers,
        },
      });
    },
    async removeItem(key, topts) {
      await _fetch(r(key), {
        method: "DELETE",
        headers: { ...opts.headers, ...topts.headers },
      });
    },
    async getKeys(base, topts) {
      const value = await _fetch(rBase(base), {
        headers: { ...opts.headers, ...topts.headers },
      });
      return Array.isArray(value) ? value : [];
    },
    async clear(base, topts) {
      await _fetch(rBase(base), {
        method: "DELETE",
        headers: { ...opts.headers, ...topts.headers },
      });
    },
  };
});
