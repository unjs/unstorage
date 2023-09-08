import { describe, vi } from "vitest";
import driver from "../../src/drivers/capacitor-preferences";
import { testDriver } from "./utils";
import { afterEach } from "node:test";

vi.mock("@capacitor/preferences", () => {
  const data = new Map<string, string>();

  const keys = vi.fn(() => Promise.resolve({ keys: Array.from(data.keys()) }));
  const get = vi.fn(({ key }) =>
    Promise.resolve({ value: data.get(key) ?? null })
  );
  const set = vi.fn(({ key, value }) => Promise.resolve(data.set(key, value)));
  const remove = vi.fn(({ key }) => Promise.resolve(data.delete(key)));
  const clear = vi.fn(() => Promise.resolve(data.clear()));

  return {
    Preferences: {
      keys,
      get,
      set,
      remove,
      clear,
    },
  };
});

describe("drivers: capacitor-preferences", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  testDriver({
    driver: driver({}),
  });

  testDriver({
    driver: driver({ base: "test" }),
  });
});
