import type { Driver, TransactionOpts } from "../..";

type DriverFactory<OptionsT, InstanceT, TransactionOptsT extends TransactionOpts> = (
  opts: OptionsT
) => Driver<OptionsT, InstanceT, TransactionOptsT>;
interface ErrorOptions {}

export function defineDriver<
  OptionsT = any,
  InstanceT = never,
  TransactionOptsT extends TransactionOpts = TransactionOpts
>(
  factory: DriverFactory<OptionsT, InstanceT, TransactionOptsT>
): DriverFactory<OptionsT, InstanceT, TransactionOptsT> {
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
