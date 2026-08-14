import type { TransactionOptions } from "../types.ts";
import {
  type DriverFactory,
  importLib,
  type LibImport,
  type DriverDependencies,
} from "./utils/index.ts";
import type { $Fetch, FetchError } from "ofetch";
import { joinURL } from "./utils/path.ts";

export interface HTTPOptions {
  base: string;
  headers?: Record<string, string>;

  /**
   * Optionally provide the [`ofetch`](https://www.npmjs.com/package/ofetch) library
   * to avoid dynamically importing it.
   */
  lib?: LibImport<typeof import("ofetch")>;
}

export const DRIVER_DEPENDENCIES: DriverDependencies = {
  lib: { name: "ofetch", version: "^1" },
};

const DRIVER_NAME = "http";

const driver: DriverFactory<HTTPOptions, Promise<$Fetch>> = (opts) => {
  const r = (key: string = "") => joinURL(opts.base!, key.replace(/:/g, "/"));

  let _fetchPromise: Promise<$Fetch> | undefined;
  const getFetch = () =>
    (_fetchPromise ??= importLib(DRIVER_NAME, "ofetch", opts.lib, () => import("ofetch")).then(
      (lib) => lib.$fetch,
    ));

  const rBase = (key: string = "") => joinURL(opts.base!, (key || "/").replace(/:/g, "/") + ":");

  const catchFetchError = (error: FetchError, fallbackVal: any = null) => {
    if (error?.response?.status === 404) {
      return fallbackVal;
    }
    throw error;
  };

  const getHeaders = (
    topts: TransactionOptions | undefined,
    defaultHeaders?: Record<string, string>,
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
    getInstance: getFetch,
    async hasItem(key, topts) {
      const _fetch = await getFetch();
      return _fetch(r(key), {
        method: "HEAD",
        headers: getHeaders(topts),
      })
        .then(() => true)
        .catch((err) => catchFetchError(err, false));
    },
    async getItem(key, tops) {
      const _fetch = await getFetch();
      const value = await _fetch(r(key), {
        headers: getHeaders(tops),
      }).catch(catchFetchError);
      return value;
    },
    async getItemRaw(key, topts) {
      const _fetch = await getFetch();
      const response = await _fetch
        .raw(r(key), {
          responseType: "arrayBuffer",
          headers: getHeaders(topts, { accept: "application/octet-stream" }),
        })
        .catch(catchFetchError);
      return response._data;
    },
    async getMeta(key, topts) {
      const _fetch = await getFetch();
      const res = await _fetch.raw(r(key), {
        method: "HEAD",
        headers: getHeaders(topts),
      });
      let mtime: Date | undefined;
      let ttl: number | undefined;
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
      const _fetch = await getFetch();
      await _fetch(r(key), {
        method: "PUT",
        body: value,
        headers: getHeaders(topts),
      });
    },
    async setItemRaw(key, value, topts) {
      const _fetch = await getFetch();
      await _fetch(r(key), {
        method: "PUT",
        body: value,
        headers: getHeaders(topts, {
          "content-type": "application/octet-stream",
        }),
      });
    },
    async removeItem(key, topts) {
      const _fetch = await getFetch();
      await _fetch(r(key), {
        method: "DELETE",
        headers: getHeaders(topts),
      });
    },
    async getKeys(base, topts) {
      const _fetch = await getFetch();
      const value = await _fetch(rBase(base), {
        headers: getHeaders(topts),
      });
      return Array.isArray(value) ? value : [];
    },
    async clear(base, topts) {
      const _fetch = await getFetch();
      await _fetch(rBase(base), {
        method: "DELETE",
        headers: getHeaders(topts),
      });
    },
  };
};

export default driver;
