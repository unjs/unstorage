import { describe, expect, it, vi } from "vitest";
import { createStorage } from "../../src/index.ts";
import { testDriver } from "./utils.ts";
import driver, { type ReactNativeAsyncStorageOptions } from "../../src/drivers/react-native-async-storage.ts";

function createMock() {
  const data = new Map<string, string>();
  const lib = {
    getItem: vi.fn(async (key: string) => data.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => void data.set(key, value)),
    removeItem: vi.fn(async (key: string) => void data.delete(key)),
    getAllKeys: vi.fn(async () => [...data.keys()]),
    multiRemove: vi.fn(async (keys: readonly string[]) => keys.forEach((key) => data.delete(key))),
    clear: vi.fn(async () => void data.clear()),
  };
  return lib;
}

const mock = createMock();

function createDriver(base?: string) {
  return { driver: driver({ base, lib: mock } as ReactNativeAsyncStorageOptions), lib: mock };
}

describe("react-native-async-storage", () => {
  testDriver({ driver: () => {
    mock.clear();
    return createDriver().driver;
  } });

  it("supports base namespaces", async () => {
    const { driver: instance, lib } = createDriver("app");
    const storage = createStorage({ driver: instance });
    await storage.setItem("foo", "bar");
    expect(lib.setItem).toHaveBeenCalledWith("app:foo", '"bar"');
    expect(await storage.getKeys()).toEqual(["foo"]);
    await storage.clear();
    expect(lib.clear).toHaveBeenCalled();
  });
});
