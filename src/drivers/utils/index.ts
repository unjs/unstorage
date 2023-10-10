import type { Driver } from "../../types";
export { normalizeKey, joinKeys } from "../../utils";

type DriverFactory<T> = (opts: T) => Driver;

export function defineDriver<T = any>(
  factory: DriverFactory<T>
): DriverFactory<T> {
  return factory;
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
