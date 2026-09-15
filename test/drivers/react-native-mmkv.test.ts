import { describe, expect, it, vi } from "vitest";

import driver, { type ReactNativeMmkvDriverOptions } from "../../src/drivers/react-native-mmkv.ts";
import { testDriver } from "./utils.ts";

function createMockMMKV() {
  const data = new Map<string, string>();
  const listeners = new Set<(key: string) => void>();
  const emit = (key: string) => {
    for (const cb of listeners) {
      cb(key);
    }
  };
  const mmkv = {
    contains: (key: string) => data.has(key),
    getString: (key: string) => data.get(key),
    set: (key: string, value: string) => {
      data.set(key, value);
      emit(key);
    },
    remove: (key: string) => {
      const removed = data.delete(key);
      if (removed) {
        emit(key);
      }
      return removed;
    },
    getAllKeys: () => [...data.keys()],
    clearAll: () => {
      data.clear();
    },
    addOnValueChangedListener: vi.fn((cb: (key: string) => void) => {
      listeners.add(cb);
      return { remove: () => listeners.delete(cb) };
    }),
  };
  return { mmkv, emit, data };
}

function createDriver(opts: ReactNativeMmkvDriverOptions) {
  const { mmkv, emit } = createMockMMKV();
  const createMMKV = vi.fn(() => mmkv);
  const lib = { createMMKV } as unknown as NonNullable<ReactNativeMmkvDriverOptions["lib"]>;
  return { driver: driver({ ...opts, lib }), createMMKV, emit, mmkv };
}

describe("drivers: react-native-mmkv", () => {
  testDriver({
    driver: () => createDriver({ id: "test" }).driver,
  });

  testDriver({
    driver: () => createDriver({ id: "test-with-base", base: "app" }).driver,
  });

  it("creates a MMKV instance with the provided configuration", async () => {
    const { driver, createMMKV } = createDriver({
      id: "custom-id",
      path: "/tmp/storage",
      encryptionKey: "encryptionkey123",
      mode: "single-process",
    });
    await driver.getInstance?.();
    expect(createMMKV).toHaveBeenCalledWith({
      id: "custom-id",
      path: "/tmp/storage",
      encryptionKey: "encryptionkey123",
      mode: "single-process",
    });
  });

  it("uses the default instance id when not provided", async () => {
    const { driver, createMMKV } = createDriver({});
    await driver.getInstance?.();
    expect(createMMKV).toHaveBeenCalledWith({
      id: "mmkv.default",
    });
  });

  it("watch() emits update events for keys in the base namespace", async () => {
    const { driver, emit } = createDriver({ id: "watched", base: "app" });
    const callback = vi.fn();
    const unwatch = await driver.watch!(callback);

    emit("app:foo");
    expect(callback).toHaveBeenCalledWith("update", "foo");

    emit("app:bar");
    expect(callback).toHaveBeenCalledWith("update", "bar");

    // Keys outside the base namespace are ignored
    emit("other:key");
    expect(callback).toHaveBeenCalledTimes(2);

    // Keys in the base namespace without a prefix are scoped to ""
    emit("app");
    expect(callback).toHaveBeenCalledWith("update", "");

    unwatch();
    emit("app:baz");
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it("watch() emits update events for all keys without a base", async () => {
    const { driver, emit } = createDriver({ id: "watched" });
    const callback = vi.fn();
    const unwatch = await driver.watch!(callback);

    emit("foo");
    expect(callback).toHaveBeenCalledWith("update", "foo");

    unwatch();
  });
});
