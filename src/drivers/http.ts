import type { TransactionOptions } from "../types.ts";
import { type DriverFactory } from "./utils/index.ts";
import { type FetchError, $fetch as _fetch } from "ofetch";
import { joinURL } from "./utils/path.ts";
import { CASMismatchError, CASUnsupportedError } from "./utils/cas.ts";

export interface HTTPOptions {
  base: string;
  headers?: Record<string, string>;
}

const DRIVER_NAME = "http";

const driver: DriverFactory<HTTPOptions> = (opts) => {
  const r = (key: string = "") => joinURL(opts.base!, key.replace(/:/g, "/"));

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
    const headers: Record<string, string> = {
      ...defaultHeaders,
      ...opts.headers,
      ...topts?.headers,
    };
    if (topts?.ttl && !headers["x-ttl"]) {
      headers["x-ttl"] = topts.ttl + "";
    }
    if (topts?.ifMatch !== undefined && !headers["if-match"]) {
      headers["if-match"] = formatCondition(topts.ifMatch);
    }
    if (topts?.ifNoneMatch !== undefined && !headers["if-none-match"]) {
      headers["if-none-match"] = formatCondition(topts.ifNoneMatch);
    }
    return headers;
  };

  const setItemHTTP = async (
    key: string,
    value: any,
    topts: TransactionOptions | undefined,
    defaultHeaders?: Record<string, string>,
  ): Promise<{ etag: string } | undefined> => {
    const wantsCAS = topts?.ifMatch !== undefined || topts?.ifNoneMatch !== undefined;
    try {
      const res = await _fetch.raw(r(key), {
        method: "PUT",
        body: value,
        headers: getHeaders(topts, defaultHeaders),
      });
      if (!wantsCAS) return undefined;
      const etag = parseEtag(res.headers.get("etag"));
      // A CAS-aware server echoes ETag on a successful conditional PUT. Its
      // absence means the server (or its mounted driver) ignored the
      // precondition headers — fail loudly to prevent silent lost updates,
      // which is the whole point of CAS.
      if (etag === undefined) {
        throw new CASUnsupportedError(DRIVER_NAME);
      }
      return { etag };
    } catch (error: any) {
      if (error?.response?.status === 412) {
        throw new CASMismatchError(DRIVER_NAME, key);
      }
      if (error?.response?.status === 501) {
        throw new CASUnsupportedError(DRIVER_NAME);
      }
      throw error;
    }
  };

  return {
    name: DRIVER_NAME,
    flags: { cas: true },
    options: opts,
    hasItem(key, topts) {
      return _fetch(r(key), {
        method: "HEAD",
        headers: getHeaders(topts),
      })
        .then(() => true)
        .catch((err) => catchFetchError(err, false));
    },
    async getItem(key, tops) {
      const value = await _fetch(r(key), {
        headers: getHeaders(tops),
      }).catch(catchFetchError);
      return value;
    },
    async getItemRaw(key, topts) {
      const response = await _fetch
        .raw(r(key), {
          responseType: "arrayBuffer",
          headers: getHeaders(topts, { accept: "application/octet-stream" }),
        })
        .catch(catchFetchError);
      return response._data;
    },
    async getMeta(key, topts) {
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
      const etag = parseEtag(res.headers.get("etag"));
      return {
        status: res.status,
        mtime,
        ttl,
        etag,
      };
    },
    setItem(key, value, topts) {
      return setItemHTTP(key, value, topts);
    },
    setItemRaw(key, value, topts) {
      return setItemHTTP(key, value, topts, {
        "content-type": "application/octet-stream",
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
};

export default driver;

// --- Internal helpers ---

// HTTP spec: ETag values are quoted (`"abc"`) and `If-Match: *` is a literal
// `*` (no quotes). Strip surrounding quotes when parsing inbound, add them
// when sending — but never quote `*`.
function parseEtag(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const v = raw.trim();
  if (v === "*") return "*";
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) {
    return v.slice(1, -1);
  }
  return v;
}

function formatCondition(value: string): string {
  if (value === "*") return "*";
  if (value.startsWith('"') && value.endsWith('"')) return value;
  return `"${value}"`;
}
