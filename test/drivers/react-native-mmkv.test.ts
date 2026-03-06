import { describe, vi } from "vitest";
import driver from "../../src/drivers/react-native-mmkv.ts";
import { testDriver } from "./utils.ts";
import { afterEach } from "node:test";

vi.mock("react-native-mmkv", () => {
  class MockMMKV {
    private data = new Map<string, string>();

    contains(key: string) {
      return this.data.has(key);
    }
    getString(key: string) {
      return this.data.get(key) ?? undefined;
    }
    set(key: string, value: string) {
      this.data.set(key, value);
    }
    delete(key: string) {
      this.data.delete(key);
    }
    getAllKeys() {
      return [...this.data.keys()];
    }
    clearAll() {
      this.data.clear();
    }
    addOnValueChangedListener(_cb: (key: string) => void) {
      return { remove: () => {} };
    }
  }
  return {
    MMKV: MockMMKV,
  };
});

describe("drivers: react-native-mmkv", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  testDriver({
    driver: driver({ id: "test" }),
  });

  testDriver({
    driver: driver({ id: "test-with-base", base: "app" }),
  });
});
