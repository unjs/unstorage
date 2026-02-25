import type { Storage, TransactionOptions, StorageMeta } from "./types.ts";
import { H3Event, HTTPError, defineHandler } from "h3";
import { stringify } from "./_utils.ts";
import { normalizeKey, normalizeBaseKey } from "./utils.ts";

export type StorageServerRequest = {
  request: globalThis.Request;
  key: string;
  type: "read" | "write";
};

const MethodToTypeMap = {
  GET: "read",
  HEAD: "read",
  PUT: "write",
  DELETE: "write",
} as const;

export interface StorageServerOptions {
  authorize?: (request: StorageServerRequest) => void | Promise<void>;
  resolvePath?: (event: { req: Request }) => string;
}

export type FetchHandler = (
  req: globalThis.Request
) => globalThis.Response | Promise<globalThis.Response>;

/**
 * This function creates a fetch handler for your custom storage server.
 *
 * The storage server will handle HEAD, GET, PUT and DELETE requests.
 * - HEAD: Return if the request item exists in the storage, including a last-modified header if the storage supports it and the meta is stored
 * - GET: Return the item if it exists
 * - PUT: Sets the item
 * - DELETE: Removes the item (or clears the whole storage if the base key was used)
 *
 * If the request sets the `Accept` header to `application/octet-stream`, the server will handle the item as raw data.
 *
 * @param storage The storage which should be used for the storage server
 * @param options Defining functions such as an authorization check and a custom path resolver
 * @returns An object containing then `handle` function for the handler
 */
export function createStorageHandler(
  storage: Storage,
  opts: StorageServerOptions = {}
): (
  req: globalThis.Request
) => globalThis.Response | Promise<globalThis.Response> {
  const handler = defineHandler(async (event) => {
    const _path =
      opts.resolvePath?.(event as { req: Request }) ?? event.url.pathname;
    const lastChar = _path[_path.length - 1];
    const isBaseKey = lastChar === ":" || lastChar === "/";
    const key = isBaseKey ? normalizeBaseKey(_path) : normalizeKey(_path);

    // Authorize Request
    if (!(event.req.method in MethodToTypeMap)) {
      throw HTTPError.status(405, `Method Not Allowed: ${event.method}`);
    }
    try {
      await opts.authorize?.({
        type: MethodToTypeMap[event.req.method as keyof typeof MethodToTypeMap],
        request: event.req as Request,
        key,
      });
    } catch (error: any) {
      const _httpError = HTTPError.isError(error)
        ? error
        : new HTTPError({
            status: 401,
            statusText: error?.message,
            cause: error,
          });
      throw _httpError;
    }

    // GET => getItem / getKeys
    if (event.req.method === "GET") {
      if (isBaseKey) {
        const keys = await storage.getKeys(key);
        return keys.map((key) => key.replace(/:/g, "/"));
      }
      const isRaw =
        event.req.headers.get("accept") === "application/octet-stream";
      const driverValue = await (isRaw
        ? storage.getItemRaw(key)
        : storage.getItem(key));
      if (driverValue === null) {
        throw new HTTPError({
          statusCode: 404,
          statusMessage: "KV value not found",
        });
      }
      setMetaHeaders(event, await storage.getMeta(key));
      return isRaw ? driverValue : stringify(driverValue);
    }

    // HEAD => hasItem + meta (mtime, ttl)
    if (event.req.method === "HEAD") {
      if (!(await storage.hasItem(key))) {
        throw new HTTPError({
          statusCode: 404,
          statusMessage: "KV value not found",
        });
      }
      setMetaHeaders(event, await storage.getMeta(key));
      return "";
    }

    // PUT => setItem
    if (event.req.method === "PUT") {
      const isRaw =
        event.req.headers.get("content-type") === "application/octet-stream";
      const topts: TransactionOptions = {
        ttl: Number(event.req.headers.get("x-ttl")) || undefined,
      };
      if (isRaw) {
        const value = await event.req.bytes();
        await storage.setItemRaw(key, value, topts);
      } else {
        const value = await event.req.text();
        if (value !== undefined) {
          await storage.setItem(key, value, topts);
        }
      }
      return "OK";
    }

    // DELETE => removeItem
    if (event.req.method === "DELETE") {
      await (isBaseKey ? storage.clear(key) : storage.removeItem(key));
      return "OK";
    }

    throw new HTTPError({
      statusCode: 405,
      statusMessage: `Method Not Allowed: ${event.method}`,
    });
  });

  return handler.fetch as (req: Request) => Response | Promise<Response>;
}

function setMetaHeaders(event: H3Event, meta: StorageMeta) {
  if (meta.mtime) {
    event.res.headers.set("last-modified", new Date(meta.mtime).toUTCString());
  }
  if (meta.ttl) {
    event.res.headers.set("x-ttl", `${meta.ttl}`);
    event.res.headers.set("cache-control", `max-age=${meta.ttl}`);
  }
}
