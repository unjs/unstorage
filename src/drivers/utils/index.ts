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
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F]|^ | $/.test(key)) {
    throw invalid(
      "Control characters and leading/trailing spaces are not allowed"
    );
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
