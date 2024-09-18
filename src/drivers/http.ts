import type { TransactionOptions } from "../types";
import { defineDriver } from "./utils";
import { type FetchError, $fetch as _fetch } from "ofetch";
import { joinURL } from "ufo";

export interface HTTPOptions {
  base: string;
  headers?: Record<string, string>;
  resolveMeta?: boolean;
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

  const getHeaders = (
    topts: TransactionOptions | undefined,
    defaultHeaders?: Record<string, string>
  ) => {
    const headers = {
      ...defaultHeaders,
      ...opts.headers,
      ...topts?.headers,
    };
    if (topts?.ttl && !headers["x-ttl"]) {
      headers["x-ttl"] = topts.ttl + "";
    }
    return headers;
  };

  return {
    name: DRIVER_NAME,
    options: opts,
    hasItem(key, topts) {
      return _fetch(r(key), {
        method: "HEAD",
        headers: getHeaders(topts),
      })
        .then(() => true)
        .catch((err) => catchFetchError(err, false));
    },
    getItem(key, topts) {
      return _fetch(r(key), {
        headers: getHeaders(topts),
      }).catch(catchFetchError);
    },
    getItemRaw(key, topts) {
      return _fetch(r(key), {
        headers: getHeaders(topts, { accept: "application/octet-stream" }),
      }).catch(catchFetchError);
    },
    async getMeta(key, topts) {
      if (opts.resolveMeta) {
        return _fetch(r(key) + "$", {
          headers: getHeaders(topts),
        }).catch(catchFetchError);
      }
      const res = await _fetch.raw(r(key), {
        method: "HEAD",
        headers: getHeaders(topts),
      });
      let mtime = undefined;
      let ttl = undefined;
      const _lastModified = res.headers.get("last-modified");
      if (_lastModified) {
        mtime = new Date(_lastModified);
      }
      const _ttl = res.headers.get("x-ttl");
      if (_ttl) {
        ttl = Number.parseInt(_ttl, 10);
      }
      return {
        status: res.status,
        mtime,
        ttl,
      };
    },
    async setItem(key, value, topts) {
      await _fetch(r(key), {
        method: "PUT",
        body: value,
        headers: getHeaders(topts),
      });
    },
    async setItemRaw(key, value, topts) {
      await _fetch(r(key), {
        method: "PUT",
        body: value,
        headers: getHeaders(topts, {
          "content-type": "application/octet-stream",
        }),
      });
    },
    async removeItem(key, topts) {
      await _fetch(r(key), {
        method: "DELETE",
        headers: getHeaders(topts),
      });
    },
    async getKeys(base, topts) {
      const value = await _fetch(rBase(base), {
        headers: getHeaders(topts),
      });
      return Array.isArray(value) ? value : [];
    },
    async clear(base, topts) {
      await _fetch(rBase(base), {
        method: "DELETE",
        headers: getHeaders(topts),
      });
    },
  };
});
