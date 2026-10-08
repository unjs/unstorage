import type { Driver } from "../..";

type DriverFactory<OptionsT, InstanceT> = (
  opts: OptionsT
) => Driver<OptionsT, InstanceT>;
interface ErrorOptions {}

export function defineDriver<OptionsT = any, InstanceT = never>(
  factory: DriverFactory<OptionsT, InstanceT>
): DriverFactory<OptionsT, InstanceT> {
  return factory;
}

export function normalizeKey(
  key: string | undefined,
  sep: ":" | "/" = ":"
): string {
  if (!key) {
    return "";
  }
  return key.replace(/[:/\\]/g, sep).replace(/^[:/\\]|[:/\\]$/g, "");
}

export function joinKeys(...keys: string[]) {
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
export function encodeURLSegment(
  driver: string,
  segment: string,
  key: string = segment
): string {
  if (!segment || segment === "." || segment === "..") {
    throw createError(
      driver,
      `Invalid key: ${JSON.stringify(key)}. Empty, "." and ".." segments are not allowed`
    );
  }
  try {
    return encodeURIComponent(segment);
  } catch {
    throw createError(
      driver,
      `Invalid key: ${JSON.stringify(key)}. It contains malformed unicode`
    );
  }
}

/**
 * Encode a key as a URL path (`a:b` => `a/b`) with each segment
 * percent-encoded, so that the key can never escape the base URL or inject
 * a `?query` / `#hash`.
 *
 * Empty keys are only allowed with `isBase` (`getKeys` / `clear`).
 */
export function encodeURLKey(
  driver: string,
  key: string | undefined,
  isBase = false
): string {
  const segments = (key || "").split(/[:/\\]/).filter(Boolean);
  if (segments.length === 0 && !isBase) {
    throw createError(driver, `Invalid key: ${JSON.stringify(key)}`);
  }
  return segments
    .map((segment) => encodeURLSegment(driver, segment, key))
    .join("/");
}

export function createError(
  driver: string,
  message: string,
  opts?: ErrorOptions
) {
  const err = new Error(`[unstorage] [${driver}] ${message}`, opts);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(err, createError);
  }
  return err;
}

export function createRequiredError(driver: string, name: string | string[]) {
  if (Array.isArray(name)) {
    return createError(
      driver,
      `Missing some of the required options ${name
        .map((n) => "`" + n + "`")
        .join(", ")}`
    );
  }
  return createError(driver, `Missing required option \`${name}\`.`);
}
