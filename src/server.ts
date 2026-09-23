import type { Storage, TransactionOptions, StorageMeta } from "./types.ts";
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
  resolvePath?: (request: globalThis.Request) => string;
}

export type FetchHandler = (
  req: globalThis.Request,
) => globalThis.Response | Promise<globalThis.Response>;

const JSON_HEADERS = { "content-type": "application/json;charset=UTF-8" } as const;

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
 * @returns A standard fetch handler
 */
export function createStorageHandler(
  storage: Storage,
  opts: StorageServerOptions = {},
): FetchHandler {
  return async (req) => {
    try {
      return await handleRequest(storage, opts, req);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

async function handleRequest(
  storage: Storage,
  opts: StorageServerOptions,
  req: globalThis.Request,
): Promise<globalThis.Response> {
  const _path = opts.resolvePath?.(req) ?? requestPath(req.url);
  const lastChar = _path[_path.length - 1];
  const isBaseKey = lastChar === ":" || lastChar === "/";
  const key = isBaseKey ? normalizeBaseKey(_path) : normalizeKey(_path);

  // Authorize Request
  const type = MethodToTypeMap[req.method as keyof typeof MethodToTypeMap];
  if (!type) {
    throw new HTTPError(405, `Method Not Allowed: ${req.method}`);
  }
  if (opts.authorize) {
    try {
      await opts.authorize({ type, request: req, key });
    } catch (error: any) {
      throw error instanceof HTTPError
        ? error
        : new HTTPError(typeof error?.status === "number" ? error.status : 401, error?.message, {
            cause: error,
          });
    }
  }

  // GET => getItem / getKeys
  if (req.method === "GET") {
    if (isBaseKey) {
      const keys = await storage.getKeys(key);
      return new Response(JSON.stringify(keys.map((key) => key.replace(/:/g, "/"))), {
        headers: JSON_HEADERS,
      });
    }
    const isRaw = req.headers.get("accept") === "application/octet-stream";
    const driverValue = await (isRaw ? storage.getItemRaw(key) : storage.getItem(key));
    if (driverValue === null) {
      throw new HTTPError(404, "KV value not found");
    }
    return new Response(isRaw ? rawBody(driverValue) : stringify(driverValue), {
      headers: metaHeaders(await storage.getMeta(key)),
    });
  }

  // HEAD => hasItem + meta (mtime, ttl)
  if (req.method === "HEAD") {
    if (!(await storage.hasItem(key))) {
      throw new HTTPError(404, "KV value not found");
    }
    return new Response(null, { headers: metaHeaders(await storage.getMeta(key)) });
  }

  // PUT => setItem
  if (req.method === "PUT") {
    const isRaw = req.headers.get("content-type") === "application/octet-stream";
    const topts: TransactionOptions = {
      ttl: Number(req.headers.get("x-ttl")) || undefined,
    };
    if (isRaw) {
      await storage.setItemRaw(key, await req.bytes(), topts);
    } else {
      await storage.setItem(key, await req.text(), topts);
    }
    return new Response("OK");
  }

  // DELETE => removeItem
  await (isBaseKey ? storage.clear(key) : storage.removeItem(key));
  return new Response("OK");
}

function metaHeaders(meta: StorageMeta): Headers {
  const headers = new Headers();
  if (meta.mtime) {
    headers.set("last-modified", new Date(meta.mtime).toUTCString());
  }
  if (meta.ttl) {
    headers.set("x-ttl", `${meta.ttl}`);
    headers.set("cache-control", `max-age=${meta.ttl}`);
  }
  return headers;
}

/** Extract the pathname without parsing the whole URL. */
function requestPath(url: string): string {
  const pathStart = url.indexOf("/", url.indexOf("://") + 3);
  if (pathStart === -1) {
    return "/";
  }
  const queryStart = url.indexOf("?", pathStart);
  return queryStart === -1 ? url.slice(pathStart) : url.slice(pathStart, queryStart);
}

/** Values a driver can return as-is. Anything else is serialized. */
function rawBody(value: any): BodyInit {
  if (
    typeof value === "string" ||
    ArrayBuffer.isView(value) ||
    value instanceof ArrayBuffer ||
    value instanceof Blob ||
    value instanceof ReadableStream
  ) {
    return value as BodyInit;
  }
  return stringify(value);
}

class HTTPError extends Error {
  override name = "HTTPError";

  status: number;
  statusText: string;

  constructor(status: number, statusText?: string, opts?: ErrorOptions) {
    const _statusText = sanitizeStatusText(statusText);
    super(_statusText, opts);
    this.status = sanitizeStatus(status);
    this.statusText = _statusText;
  }
}

function errorResponse(error: unknown): globalThis.Response {
  if (!(error instanceof HTTPError)) {
    console.error("[unstorage] [server]", error);
    error = new HTTPError(500, "Internal Server Error");
  }
  const { status, statusText, message } = error as HTTPError;
  return new Response(JSON.stringify({ status, statusText, message }), {
    status,
    statusText,
    headers: JSON_HEADERS,
  });
}

function sanitizeStatus(status: number): number {
  return status >= 100 && status <= 599 ? status : 500;
}

/** Strip characters that are not allowed in an HTTP reason phrase. */
function sanitizeStatusText(statusText: string = ""): string {
  return statusText.replace(/[^\u0020-\u007E]/g, "");
}
