import type { RequestListener } from "node:http";
import {
  createApp,
  createError,
  isError,
  eventHandler,
  toNodeListener,
  getRequestHeader,
  setResponseHeader,
  readRawBody,
  EventHandler,
  H3Event,
} from "h3";
import { Storage } from "./types";
import { stringify } from "./_utils";
import { normalizeKey, normalizeBaseKey } from "./utils";

export type StorageServerRequest = {
  event: H3Event;
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
  resolvePath?: (event: H3Event) => string;
}

/**
 * This function creates an h3-based handler for the storage server. It can then be used as event handler in h3 or Nitro
 * @param storage The storage which should be used for the storage server 
 * @param opts Storage options to set the authorization check or a custom path resolver
 * @returns 
 * @see createStorageServer if a node-compatible handler is needed
 */
export function createH3StorageHandler(
  storage: Storage,
  opts: StorageServerOptions = {}
): EventHandler {
  return eventHandler(async (event) => {
    const _path = opts.resolvePath?.(event) ?? event.path;
    const isBaseKey = _path.endsWith(":") || _path.endsWith("/");
    const key = isBaseKey ? normalizeBaseKey(_path) : normalizeKey(_path);

    // Authorize Request
    if (!(event.method in MethodToTypeMap)) {
      throw createError({
        statusCode: 405,
        statusMessage: `Method Not Allowed: ${event.method}`,
      });
    }
    try {
      await opts.authorize?.({
        type: MethodToTypeMap[event.method as keyof typeof MethodToTypeMap],
        event,
        key,
      });
    } catch (error: any) {
      const _httpError = isError(error)
        ? error
        : createError({
            statusMessage: error?.message,
            statusCode: 401,
            ...error,
          });
      throw _httpError;
    }

    // GET => getItem
    if (event.method === "GET") {
      if (isBaseKey) {
        const keys = await storage.getKeys(key);
        return keys.map((key) => key.replace(/:/g, "/"));
      }

      const isRaw =
        getRequestHeader(event, "accept") === "application/octet-stream";

      const checkNotFound = (value: any) => {
        if (value === null) {
          throw createError({
            statusMessage: "KV value not found",
            statusCode: 404,
          });
        }
      };

      if (isRaw) {
        const value = await storage.getItemRaw(key);
        checkNotFound(value);
        return value;
      } else {
        const value = await storage.getItem(key);
        checkNotFound(value);
        return stringify(value);
      }
    }

    // HEAD => hasItem + meta (mtime)
    if (event.method === "HEAD") {
      const _hasItem = await storage.hasItem(key);
      event.node.res.statusCode = _hasItem ? 200 : 404;
      if (_hasItem) {
        const meta = await storage.getMeta(key);
        if (meta.mtime) {
          setResponseHeader(
            event,
            "last-modified",
            new Date(meta.mtime).toUTCString()
          );
        }
      }
      return "";
    }

    // PUT => setItem
    if (event.method === "PUT") {
      const isRaw =
        getRequestHeader(event, "content-type") === "application/octet-stream";
      if (isRaw) {
        const value = await readRawBody(event);
        await storage.setItemRaw(key, value);
      } else {
        const value = await readRawBody(event, "utf8");
        if (value !== undefined) {
          await storage.setItem(key, value);
        }
      }
      return "OK";
    }

    // DELETE => removeItem
    if (event.method === "DELETE") {
      await (isBaseKey ? storage.clear(key) : storage.removeItem(key));
      return "OK";
    }

    throw createError({
      statusCode: 405,
      statusMessage: `Method Not Allowed: ${event.method}`,
    });
  });
}

/**
 * This function creates a node-compatible handler for your custom storage server.
 * 
 * The storage server will handle HEAD, GET, PUT and DELETE requests.
 * HEAD: Return if the request item exists in the storage, including a last-modified header if the storage supports it and the meta is stored
 * GET: Return the item if it exists
 * PUT: Sets the item
 * DELETE: Removes the item (or clears the whole storage if the base key was used)
 *
 * If the request sets the `Accept` header to `application/octet-stream`, the server will handle the item as raw data.
 * 
 * @param storage The storage which should be used for the storage server
 * @param options Defining functions such as an authorization check and a custom path resolver 
 * @returns An object containing then `handle` function for the handler
 * @see createH3StorageHandler For the bare h3 version which can be used with h3 or Nitro
 */
export function createStorageServer(
  storage: Storage,
  options: StorageServerOptions = {}
): { handle: RequestListener } {
  const app = createApp({ debug: true });
  const handler = createH3StorageHandler(storage, options);
  app.use(handler);
  return {
    handle: toNodeListener(app),
  };
}
