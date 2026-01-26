import type { RequestListener } from "node:http";
import { H3, HTTPError, eventHandler, EventHandler, H3Event } from "h3";
import { toNodeHandler } from "h3/node";
import destr from "destr";
import { Storage, StorageValue } from "./types";
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

export function createH3StorageHandler(
  storage: Storage,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  opts: StorageServerOptions = {}
): EventHandler {
  return eventHandler(async (event) => {
    const method = event.req.method;
    const _path = opts.resolvePath?.(event) ?? event.path;
    const isBaseKey = _path.endsWith(":") || _path.endsWith("/");
    const key = isBaseKey ? normalizeBaseKey(_path) : normalizeKey(_path);

    // Authorize Request
    try {
      await opts.authorize?.({
        type: MethodToTypeMap[method],
        event,
        key,
      });
    } catch (error) {
      const _httpError = HTTPError.isError(error)
        ? error
        : new HTTPError({
            statusText: error.message,
            status: 401,
            ...error,
          });
      throw _httpError;
    }

    // GET => getItem
    if (method === "GET") {
      if (isBaseKey) {
        const keys = await storage.getKeys(key);
        return keys.map((key) => key.replace(/:/g, "/"));
      }

      const isRaw =
        event.req.headers.get("accept") === "application/octet-stream";
      if (isRaw) {
        const value = await storage.getItemRaw(key);
        return value;
      } else {
        const value = await storage.getItem(key);
        return stringify(value);
      }
    }

    // HEAD => hasItem + meta (mtime)
    if (method === "HEAD") {
      const _hasItem = await storage.hasItem(key);
      event.res.status = _hasItem ? 200 : 404;
      if (_hasItem) {
        const meta = await storage.getMeta(key);
        if (meta.mtime) {
          event.res.headers.set(
            "last-modified",
            new Date(meta.mtime).toUTCString()
          );
        }
      }
      return "";
    }

    // PUT => setItem
    if (method === "PUT") {
      const isRaw =
        event.req.headers.get("content-type") === "application/octet-stream";
      if (isRaw) {
        const value = await event.req.arrayBuffer();
        await storage.setItemRaw(key, value);
      } else {
        const body = await event.req.text();
        const value = destr(body);
        await storage.setItem(key, value as StorageValue);
      }
      return "OK";
    }

    // DELETE => removeItem
    if (method === "DELETE") {
      await (isBaseKey ? storage.clear(key) : storage.removeItem(key));
      return "OK";
    }

    throw new HTTPError({
      status: 405,
      statusText: `Method Not Allowed: ${method}`,
    });
  });
}

export function createStorageServer(
  storage: Storage,
  options: StorageServerOptions = {}
): { handle: RequestListener } {
  const app = new H3();
  const handler = createH3StorageHandler(storage, options);
  app.use(handler);
  return {
    handle: toNodeHandler(app),
  };
}
