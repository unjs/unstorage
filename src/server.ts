import type { RequestListener } from "node:http";
import {
  createApp,
  createError,
  isError,
  readBody,
  eventHandler,
  toNodeListener,
  getMethod,
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
}

export function createH3StorageHandler(
  storage: Storage,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  opts: StorageServerOptions = {}
): EventHandler {
  return eventHandler(async (event) => {
    const method = getMethod(event);
    const isBaseKey = event.path.endsWith(":") || event.path.endsWith("/");
    const key = isBaseKey
      ? normalizeBaseKey(event.path)
      : normalizeKey(event.path);

    // Authorize Request
    try {
      await opts.authorize?.({
        type: MethodToTypeMap[method],
        event,
        key,
      });
    } catch (error) {
      const _httpError = isError(error)
        ? error
        : createError({
            statusMessage: error.message,
            statusCode: 401,
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
        getRequestHeader(event, "accept") === "application/octet-stream";
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
    if (method === "PUT") {
      const isRaw =
        getRequestHeader(event, "content-type") === "application/octet-stream";
      if (isRaw) {
        const value = await readRawBody(event);
        await storage.setItemRaw(key, value);
      } else {
        const value = await readBody(event);
        await storage.setItem(key, value);
      }
      return "OK";
    }

    // DELETE => removeItem
    if (method === "DELETE") {
      await (isBaseKey ? storage.clear(key) : storage.removeItem(key));
      return "OK";
    }

    throw createError({
      statusCode: 405,
      statusMessage: `Method Not Allowed: ${method}`,
    });
  });
}

export function createStorageServer(
  storage: Storage,
  options: StorageServerOptions = {}
): { handle: RequestListener } {
  const app = createApp();
  const handler = createH3StorageHandler(storage, options);
  app.use(handler);
  return {
    handle: toNodeListener(app),
  };
}
