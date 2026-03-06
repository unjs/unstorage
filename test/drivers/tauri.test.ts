import { describe, vi } from "vitest";
import driver from "../../src/drivers/tauri.ts";
import { testDriver } from "./utils.ts";
import { afterEach } from "node:test";

vi.mock("@tauri-apps/plugin-store", () => {
  return {
    load: vi.fn(() => {
      const data = new Map<string, unknown>();
      return Promise.resolve({
        has: (key: string) => Promise.resolve(data.has(key)),
        get: (key: string) => Promise.resolve(data.get(key) ?? null),
        set: (key: string, value: unknown) =>
          Promise.resolve(void data.set(key, value)),
        delete: (key: string) => Promise.resolve(void data.delete(key)),
        keys: () => Promise.resolve([...data.keys()]),
        clear: () => Promise.resolve(void data.clear()),
        onChange: (_cb: (key: string, value: unknown) => void) => () => {},
      });
    }),
  };
});

describe("drivers: tauri", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  testDriver({
    driver: driver({ path: "store.json" }),
  });

  testDriver({
    driver: driver({ path: "store.json", base: "app" }),
  });
});
