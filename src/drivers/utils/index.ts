import type { Driver } from "unstorage";

export type DriverFactory<OptionsT, InstanceT = never> = (
  opts: OptionsT,
) => Driver<OptionsT, InstanceT>;

export interface ErrorOptions {}

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
