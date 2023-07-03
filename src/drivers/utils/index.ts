import type { Driver } from "../../types";

type DriverFactory<T> = (opts: T) => Driver;

export function defineDriver<T = any>(
  factory: DriverFactory<T>
): DriverFactory<T> {
  return factory;
}

export function normalizeKey(key: string | undefined): string {
  if (!key) {
    return "";
  }
  return key.replace(/[/\\]/g, ":").replace(/^:|:$/g, "");
}


export function joinKeys(...keys: string[]) {
  return keys.map(normalizeKey).filter(Boolean).join(":");
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
