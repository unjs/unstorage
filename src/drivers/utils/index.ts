import type { Driver } from "unstorage";

export type { DriverDependency, DriverDependencies } from "unstorage";

export type DriverFactory<OptionsT, InstanceT = never> = (
  opts: OptionsT,
) => Driver<OptionsT, InstanceT>;

export interface ErrorOptions {
  cause?: unknown;
}

/**
 * An optional library used by a driver.
 *
 * Drivers dynamically import their optional dependencies. If the bundler or runtime cannot
 * resolve them (or you simply prefer a static top-level import), the library can be provided
 * as the module namespace object itself or as a (possibly async) function returning it.
 *
 * @example
 * ```ts
 * import * as ioredis from "ioredis";
 * redisDriver({ lib: ioredis });
 * // or
 * redisDriver({ lib: () => import("ioredis") });
 * ```
 */
export type LibImport<T> = T | (() => T | Promise<T>);

/**
 * Resolve an optional (peer) library used by a driver.
 *
 * Uses the user provided `lib` when available, otherwise falls back to a runtime dynamic import of
 * `name`, resolved from the current working directory first and then from unstorage itself.
 *
 * The fallback import specifier is intentionally not a string literal so that bundlers
 * (rollup, rolldown, vite, esbuild, ...) do not try to eagerly resolve and bundle
 * optional dependencies that may not be installed.
 */
export async function importLib<T>(
  driver: string,
  name: string,
  lib: LibImport<T> | undefined,
): Promise<T> {
  if (lib) {
    return typeof lib === "function" ? await (lib as () => T | Promise<T>)() : lib;
  }
  try {
    const resolved = resolveFromCwd(name);
    return await import(/* @vite-ignore */ resolved || name);
  } catch (cause) {
    throw createError(
      driver,
      `Cannot import \`${name}\`. Make sure it is installed or provide it via the \`lib\` option.`,
      { cause },
    );
  }
}

/**
 * Resolve `name` from the current working directory to a `file://` URL.
 *
 * Returns `undefined` when not running in a Node.js compatible runtime or when `name` cannot be resolved.
 */
function resolveFromCwd(name: string): string | undefined {
  const proc = globalThis.process;
  const nodeModule = proc?.getBuiltinModule?.("node:module");
  const nodeURL = proc?.getBuiltinModule?.("node:url");
  if (!nodeModule?.createRequire || !nodeURL?.pathToFileURL) {
    return;
  }
  try {
    const cwdURL = nodeURL.pathToFileURL(`${proc.cwd()}/`);
    return nodeURL.pathToFileURL(nodeModule.createRequire(cwdURL).resolve(name)).href;
  } catch {
    // Not resolvable from cwd
  }
}

export function normalizeKey(key: string | undefined, sep: ":" | "/" = ":"): string {
  if (!key) {
    return "";
  }
  return key.replace(/[:/\\]/g, sep).replace(/^[:/\\]|[:/\\]$/g, "");
}

export function joinKeys(...keys: string[]): string {
  return keys
    .map((key) => normalizeKey(key))
    .filter(Boolean)
    .join(":");
}

/**
 * Percent-encode a single URL path segment.
 *
 * Throws for empty, `.` and `..` segments (that URL parsers would collapse)
 * and for malformed unicode (lone surrogates).
 */
export function encodeURLSegment(driver: string, segment: string, key: string = segment): string {
  if (!segment || segment === "." || segment === "..") {
    throw createError(
      driver,
      `Invalid key: ${JSON.stringify(key)}. Empty, "." and ".." segments are not allowed`,
    );
  }
  try {
    return encodeURIComponent(segment);
  } catch {
    throw createError(driver, `Invalid key: ${JSON.stringify(key)}. It contains malformed unicode`);
  }
}

/**
 * Encode a key as a URL path (`a:b` => `a/b`) with each segment
 * percent-encoded, so that the key can never escape the base URL or inject
 * a `?query` / `#hash`.
 */
export function encodeURLKey(driver: string, key: string | undefined): string {
  return (key || "")
    .split(/[:/\\]/)
    .filter(Boolean)
    .map((segment) => encodeURLSegment(driver, segment, key))
    .join("/");
}

/**
 * Validate a key that a third-party SDK puts into a URL path *without*
 * encoding it, so that the key can never escape its path.
 *
 * Throws for empty keys, `?` / `#`, control characters, leading / trailing
 * spaces and `.` / `..` segments (including the `%2e` spelling).
 */
export function assertURLPathKey(driver: string, key: string): string {
  const invalid = (reason: string) =>
    createError(driver, `Invalid key: ${JSON.stringify(key)}. ${reason}`);
  if (!key) {
    throw invalid("Empty keys are not allowed");
  }
  if (/[?#]/.test(key)) {
    throw invalid(`"?" and "#" are not allowed`);
  }
  // URL parsers remove TAB/CR/LF anywhere and strip leading/trailing C0
  // controls and spaces, which could turn a key into a dot or empty segment
  // oxlint-disable-next-line no-control-regex
  if (/[\u0000-\u001F]|^ | $/.test(key)) {
    throw invalid("Control characters and leading/trailing spaces are not allowed");
  }
  const hasDotSegment = key.split(/[/\\]|%2f|%5c/i).some((segment) => {
    segment = segment.replace(/%2e/gi, ".");
    return segment === "." || segment === "..";
  });
  if (hasDotSegment) {
    throw invalid(`"." and ".." segments are not allowed`);
  }
  return key;
}

/**
 * Escape glob special characters (`*`, `?`, `[`, `]`, `\`) so that a key
 * prefix can be used literally in a redis `SCAN MATCH` pattern.
 */
export function escapeRedisGlob(pattern: string): string {
  return pattern.replace(/[*?[\]\\]/g, String.raw`\$&`);
}

export function createError(driver: string, message: string, opts?: ErrorOptions): Error {
  const err = new Error(`[unstorage] [${driver}] ${message}`, opts);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(err, createError);
  }
  return err;
}

export function createRequiredError(driver: string, name: string | string[]): Error {
  if (Array.isArray(name)) {
    return createError(
      driver,
      `Missing some of the required options ${name.map((n) => "`" + n + "`").join(", ")}`,
    );
  }
  return createError(driver, `Missing required option \`${name}\`.`);
}
