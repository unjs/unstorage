// Minimal `fetch` wrapper (baseURL, query, JSON body and errors) for drivers talking to an HTTP API.

import { joinURL } from "./path.ts";

export type FetchQuery = Record<string, string | number | boolean | undefined>;

export interface FetchOptions extends Omit<RequestInit, "body" | "headers"> {
  /** Base URL prepended to the request path. */
  baseURL?: string;
  /** Request headers. Entries with an `undefined` value are skipped. */
  headers?: Record<string, string | undefined>;
  /** Query params appended to the URL. Entries with an `undefined` value are skipped. */
  query?: FetchQuery;
  /** Request body. Plain objects and arrays are sent as JSON. */
  body?: BodyInit | Record<string, any> | any[] | null;
}

export type Fetch = (path?: string, opts?: FetchOptions) => Promise<Response>;

export class FetchError extends Error {
  override name = "FetchError";

  /** Failed response. Its body is already consumed to build the error message. */
  response: Response;

  /** Response status code. */
  status: number;

  /** Response body (parsed as JSON when possible). */
  data?: unknown;

  constructor(method: string, url: string, response: Response, body?: string) {
    super(
      `[${method}] "${url}": ${response.status} ${response.statusText}${body ? ` ${body}` : ""}`,
    );
    this.response = response;
    this.status = response.status;
    if (body) {
      try {
        this.data = JSON.parse(body);
      } catch {
        this.data = body;
      }
    }
  }
}

/**
 * Send a request and return the response, throwing a {@link FetchError} for non-ok responses.
 */
export async function fetchRequest(path = "", opts: FetchOptions = {}): Promise<Response> {
  const { baseURL, query, headers, body, ...init } = opts;

  const url = requestURL(baseURL, path, query);
  const _headers = normalizeHeaders(headers);

  let _body = body as BodyInit | null | undefined;
  if (isJSONSerializable(body)) {
    _body = JSON.stringify(body);
    _headers["content-type"] ??= "application/json";
  }

  const response = await fetch(url, { ...init, headers: _headers, body: _body });

  if (!response.ok) {
    throw new FetchError(init.method || "GET", url, response, await responseText(response));
  }

  return response;
}

/**
 * Create a {@link fetchRequest} function with default options.
 *
 * Per-request `headers` and `query` are merged with (and override) the defaults.
 */
export function createFetch(defaults: FetchOptions = {}): Fetch {
  return (path = "", opts = {}) =>
    fetchRequest(path, {
      ...defaults,
      ...opts,
      headers: { ...defaults.headers, ...opts.headers },
      query: { ...defaults.query, ...opts.query },
    });
}

function requestURL(baseURL: string | undefined, path: string, query?: FetchQuery): string {
  let url = baseURL ? joinURL(baseURL, path) : path;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        params.set(key, String(value));
      }
    }
    const search = params.toString();
    if (search) {
      url += (url.includes("?") ? "&" : "?") + search;
    }
  }
  return url;
}

function normalizeHeaders(headers?: Record<string, string | undefined>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers || {})) {
    if (value !== undefined) {
      normalized[key.toLowerCase()] = value;
    }
  }
  return normalized;
}

/** Only plain objects and arrays are serialized. Everything else (string, buffer, stream, ...) is a valid `BodyInit`. */
function isJSONSerializable(body: unknown): boolean {
  if (!body || typeof body !== "object") {
    return false;
  }
  if (Array.isArray(body)) {
    return true;
  }
  const proto = Object.getPrototypeOf(body);
  return proto === null || proto === Object.prototype;
}

async function responseText(response: Response): Promise<string | undefined> {
  try {
    const text = (await response.text()).trim();
    return text.length > 256 ? text.slice(0, 256) + "..." : text || undefined;
  } catch {
    // Ignore unreadable bodies (the status is still reported)
  }
}
