import { describe, it, expect, vi } from "vitest";
import {
  createStorage,
  snapshot,
  restoreSnapshot,
  prefixStorage,
  type Driver,
} from "../src";
import memory from "../src/drivers/memory";

const data = {
  "etc:conf": "test",
  "data:foo": 123,
};

describe("storage", () => {
  it("mount/unmount", async () => {
    const storage = createStorage().mount("/mnt", memory());
    await restoreSnapshot(storage, data, "mnt");
    expect(await snapshot(storage, "/mnt")).toMatchObject(data);
  });

  it("getMount and getMounts", () => {
    const storage = createStorage();

    storage.mount("/mnt", memory());

    storage.mount("cache", memory());
    storage.mount("cache:sub", memory());
    expect(storage.getMount("/cache:").base).toBe("cache:");
    expect(storage.getMount("/cache:foo").base).toBe("cache:");
    expect(storage.getMount("/cache:sub").base).toBe("cache:sub:");
    expect(storage.getMount("/cache:sub:foo").base).toBe("cache:sub:");

    expect(storage.getMounts("/cache").map((m) => m.base))
      .toMatchInlineSnapshot(`
        [
          "cache:sub:",
          "cache:",
        ]
      `);
    expect(storage.getMounts("/cache:sub").map((m) => m.base))
      .toMatchInlineSnapshot(`
        [
          "cache:sub:",
        ]
      `);
    expect(
      storage.getMounts("/cache:sub", { parents: true }).map((m) => m.base)
    ).toMatchInlineSnapshot(`
      [
        "cache:sub:",
        "cache:",
        "",
      ]
    `);

    expect(storage.getMounts().map((m) => m.base)).toMatchInlineSnapshot(`
      [
        "cache:sub:",
        "cache:",
        "mnt:",
        "",
      ]
    `);
  });

  it("snapshot", async () => {
    const storage = createStorage();
    await restoreSnapshot(storage, data);
    expect(await snapshot(storage, "")).toMatchObject(data);
  });

  it("watch", async () => {
    const onChange = vi.fn();
    const storage = createStorage().mount("/mnt", memory());
    await storage.watch(onChange);
    await restoreSnapshot(storage, data, "mnt");
    expect(onChange).toHaveBeenCalledWith("update", "mnt:etc:conf");
    expect(onChange).toHaveBeenCalledWith("update", "mnt:data:foo");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("unwatch return", async () => {
    const onChange = vi.fn();
    const storage = createStorage().mount("/mnt", memory());
    const unwatch = await storage.watch(onChange);
    await storage.setItem("mnt:data:foo", 42);
    await unwatch();
    await storage.setItem("mnt:data:foo", 41);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("unwatch all", async () => {
    const onChange = vi.fn();
    const storage = createStorage().mount("/mnt", memory());
    await storage.watch(onChange);
    await storage.setItem("mnt:data:foo", 42);
    await storage.unwatch();
    await storage.setItem("mnt:data:foo", 41);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("mount overides", async () => {
    const mainStorage = memory();
    const storage = createStorage({ driver: mainStorage });
    await storage.setItem("/mnt/test.txt", "v1");
    await storage.setItem("/mnt/test.base.txt", "v1");

    const initialKeys = await storage.getKeys();
    expect(initialKeys).toMatchInlineSnapshot(`
      [
        "mnt:test.txt",
        "mnt:test.base.txt",
      ]
    `);

    storage.mount("/mnt", memory());
    await storage.setItem("/mnt/test.txt", "v2");

    await storage.setItem("/mnt/foo/test.txt", "v3");
    storage.mount("/mnt/foo", memory());
    expect(await storage.getItem("/mnt/foo/test.txt")).toBe(null);

    expect(await storage.getItem("/mnt/test.txt")).toBe("v2");
    expect(await storage.getKeys()).toMatchInlineSnapshot(`
      [
        "mnt:test.txt",
      ]
    `);

    await storage.clear("/mnt");
    await storage.unmount("/mnt");
    expect(await storage.getKeys()).toMatchObject(initialKeys);
    expect(await storage.getItem("/mnt/test.txt")).toBe("v1");
  });
});

describe("utils", () => {
  it("prefixStorage", async () => {
    const storage = createStorage();
    const pStorage = prefixStorage(storage, "foo");
    await pStorage.setItem("x", "bar");
    await pStorage.setItem("y", "baz");
    expect(await storage.getItem("foo:x")).toBe("bar");
    expect(await pStorage.getItem("x")).toBe("bar");
    expect(await pStorage.getKeys()).toStrictEqual(["x", "y"]);

    // Higher order storage
    const secondStorage = createStorage();
    secondStorage.mount("/mnt", storage);
    const mntStorage = prefixStorage(secondStorage, "mnt");

    expect(await mntStorage.getKeys()).toStrictEqual(["foo:x", "foo:y"]);
    // Get keys from sub-storage
    expect(await mntStorage.getKeys("foo")).toStrictEqual(["foo:x", "foo:y"]);
  });

  it("stringify", () => {
    const storage = createStorage();
    expect(async () => await storage.setItem("foo", [])).not.toThrow();
  });

  it("has aliases", async () => {
    const storage = createStorage();

    await storage.setItem("foo", "bar");
    expect(await storage.has("foo")).toBe(true);
    expect(await storage.get("foo")).toBe("bar");
    expect(await storage.keys()).toEqual(["foo"]);
    await storage.del("foo");
    expect(await storage.has("foo")).toBe(false);
    await storage.setItem("bar", "baz");
    await storage.remove("bar");
    expect(await storage.has("bar")).toBe(false);
  });
});

describe("Regression", () => {
  it("setItems doeesn't upload twice", async () => {
    /**
     * https://github.com/unjs/unstorage/pull/392
     */

    const setItem = vi.fn();
    const setItems = vi.fn();

    const driver = memory() as Driver<unknown, unknown>;
    const storage = createStorage({
      driver: {
        ...driver,
        setItem: (...args) => {
          setItem(...args);
          return driver.setItem?.(...args);
        },
        setItems: (...args) => {
          setItems(...args);
          return driver.setItems?.(...args);
        },
      },
    });

    await storage.setItems([{ key: "foo.txt", value: "bar" }]);
    expect(setItem).toHaveBeenCalledTimes(0);
    expect(setItems).toHaveBeenCalledTimes(1);
  });
});
