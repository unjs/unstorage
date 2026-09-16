import { describe, expect, it, vi } from "vitest";
import driver, { type TauriStorageDriverOptions } from "../../src/drivers/tauri.ts";
import { testDriver } from "./utils.ts";

function createMockStore() {
  const data = new Map<string, unknown>();
  const onChangeListeners = new Set<(key: string, value: unknown) => void>();
  const store = {
    has: (key: string) => Promise.resolve(data.has(key)),
    get: (key: string) => Promise.resolve(data.get(key) ?? null),
    set: (key: string, value: unknown) => Promise.resolve(void data.set(key, value)),
    delete: (key: string) => Promise.resolve(void data.delete(key)),
    keys: () => Promise.resolve([...data.keys()]),
    clear: () => Promise.resolve(void data.clear()),
    onChange: vi.fn((cb: (key: string, value: unknown) => void) => {
      onChangeListeners.add(cb);
      return Promise.resolve(() => onChangeListeners.delete(cb));
    }),
  };
  return {
    store,
    load: vi.fn(() => Promise.resolve(store)),
    emit: (key: string, value: unknown) => {
      for (const cb of onChangeListeners) {
        cb(key, value);
      }
    },
  };
}

function createDriver(overrides: Partial<TauriStorageDriverOptions> = {}) {
  const mock = createMockStore();
  return {
    mock,
    driver: driver({
      path: "store.json",
      lib: mock as unknown as NonNullable<TauriStorageDriverOptions["lib"]>,
      ...overrides,
    }),
  };
}

describe("drivers: tauri", () => {
  testDriver({
    driver: () => createDriver().driver,
  });

  testDriver({
    driver: () => createDriver({ base: "app" }).driver,
  });

  it("watch: forwards scoped events, ignores unrelated keys, distinguishes remove", async () => {
    const { mock, driver: d } = createDriver({ base: "app" });
    const events: { event: string; key: string }[] = [];
    const unwatch = await d.watch!((event, key) => {
      events.push({ event, key });
    });
    expect(mock.load).toHaveBeenCalledWith("store.json", undefined);
    mock.emit("app:foo", "value");
    mock.emit("other:foo", "value");
    mock.emit("app:bar", null);
    expect(events).toMatchObject([
      { event: "update", key: "foo" },
      { event: "remove", key: "bar" },
    ]);
    await unwatch();
  });
});
