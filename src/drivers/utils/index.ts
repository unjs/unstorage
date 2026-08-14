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
 * Uses the user provided `lib` when available, otherwise falls back to `load()` (a dynamic import).
 */
export async function importLib<T>(
  driver: string,
  name: string,
  lib: LibImport<T> | undefined,
  // NOTE: `any` since dynamic import types of CJS libs can differ from `typeof import(...)`
  load: () => Promise<any>,
): Promise<T> {
  if (lib) {
    return typeof lib === "function" ? await (lib as () => T | Promise<T>)() : lib;
  }
  try {
    return await load();
  } catch (cause) {
    throw createError(
      driver,
      `Cannot import \`${name}\`. Make sure it is installed or provide it via the \`lib\` option.`,
      { cause },
    );
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
