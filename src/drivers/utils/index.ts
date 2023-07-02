import type { Driver } from "../../types";

type DriverFactory<T> = (opts?: T) => Driver;

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

export function millisecondsToSeconds(value: number) {
  return value / 1000;
}
