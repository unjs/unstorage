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

export function normalizeKey(key: string | undefined): string {
  if (!key) {
    return "";
  }
  return key.replace(/[/\\]/g, ":").replace(/^:|:$/g, "");
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
