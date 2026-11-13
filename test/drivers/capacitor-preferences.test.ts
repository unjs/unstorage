import { describe, expect, it, vi } from "vitest";
import driver from "../../src/drivers/capacitor-preferences.ts";
import { testDriver } from "./utils.ts";
import { afterEach } from "node:test";

vi.mock("@capacitor/preferences", () => {
  const data = new Map<string, string>();

  const keys = vi.fn(() => Promise.resolve({ keys: [...data.keys()] }));
  const get = vi.fn(({ key }) => Promise.resolve({ value: data.get(key) ?? null }));
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
    additionalTests: (ctx) => {
      it("ignores keys outside of base", async () => {
        const { Preferences } = await import("@capacitor/preferences");
        await Preferences.set({ key: "testing:foo", value: "bar" });
        await ctx.storage.setItem("s1:a", "test_data");
        expect(await ctx.storage.getKeys()).toMatchObject(["s1:a"]);
        await ctx.storage.clear();
        expect((await Preferences.keys()).keys).toMatchObject(["testing:foo"]);
        await Preferences.remove({ key: "testing:foo" });
      });
    },
  });
});
