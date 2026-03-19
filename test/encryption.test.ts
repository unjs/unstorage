import { describe, expect, it } from "vitest";
import { createStorage, encryptedStorage, prefixStorage } from "../src/index.ts";

describe("encryptedStorage", () => {
  const encryptionKey = "e9iF+8pS8qAjnj7B1+ZwdzWQ+KXNJGUPW3HdDuMJPgI=";

  it("getItems", async () => {
    const storage = encryptedStorage(createStorage(), encryptionKey);
    await storage.setItem("a", "foo");
    await storage.setItem("b", "bar");

    const items = await storage.getItems(["a", { key: "b", options: { removeMeta: true } }]);
    expect(items).toEqual([
      { key: "a", value: "foo" },
      { key: "b", value: "bar" },
    ]);
  });

  it("setItems", async () => {
    const storage = encryptedStorage(createStorage(), encryptionKey);
    await storage.setItems([
      { key: "a", value: "foo" },
      { key: "b", value: "bar" },
    ]);
    expect(await storage.getItem("a")).toBe("foo");
    expect(await storage.getItem("b")).toBe("bar");
  });

  it("setItemRaw and getItemRaw", async () => {
    const storage = encryptedStorage(createStorage(), encryptionKey);
    const raw = new TextEncoder().encode("raw-data");
    await storage.setItemRaw("raw", raw);
    const result = await storage.getItemRaw("raw");
    expect(new TextDecoder().decode(result as Uint8Array)).toBe("raw-data");
  });

  it("getItemRaw returns null for missing key", async () => {
    const storage = encryptedStorage(createStorage(), encryptionKey);
    expect(await storage.getItemRaw("missing")).toBeNull();
  });

  it("getKeys with base filter and key encryption", async () => {
    const storage = encryptedStorage(createStorage(), encryptionKey, true);
    await storage.setItem("foo/a", "1");
    await storage.setItem("bar/b", "2");
    expect(await storage.getKeys("foo")).toStrictEqual(["foo:a"]);
  });

  it("prefixed encryptedStorage", async () => {
    const storage = createStorage();
    const pStorage = prefixStorage(storage, "foo");
    const encStorage = encryptedStorage(pStorage, encryptionKey, false);
    await encStorage.setItem("x", "bar");
    await encStorage.setItem("y", "baz");
    expect(await encStorage.getItem("x")).toBe("bar");
    expect(await encStorage.getKeys()).toStrictEqual(["x", "y"]);
    expect(await storage.getItem("x")).toBeNull();
    expect(await storage.getItem("foo:x")).toBeTypeOf("object");

    // Higher order storage
    const secondStorage = createStorage();
    secondStorage.mount("/mnt", storage);
    const mntStorage = prefixStorage(secondStorage, "mnt");

    expect(await mntStorage.getKeys()).toStrictEqual(["foo:x", "foo:y"]);
    expect(await mntStorage.getKeys("foo")).toStrictEqual(["foo:x", "foo:y"]);
  });

  it("prefixed encryptedStorage with key encryption", async () => {
    const storage = createStorage();
    const pStorage = prefixStorage(storage, "foo");
    const encStorage = encryptedStorage(pStorage, encryptionKey, true);
    await encStorage.setItem("x", "bar");
    await encStorage.setItem("y", "baz");
    expect(await encStorage.getItem("x")).toBe("bar");
    expect(await encStorage.getKeys()).toStrictEqual(["x", "y"]);
    expect(await storage.getItem("x")).toBeNull();
    expect(await storage.getItem("foo:x")).toBeTypeOf("object");

    // Higher order storage
    const secondStorage = createStorage();
    secondStorage.mount("/mnt", storage);
    const mntStorage = prefixStorage(secondStorage, "mnt");

    for (const key of await mntStorage.getKeys()) {
      expect(key).toContain("foo:$enc:");
    }
    for (const key of await mntStorage.getKeys("foo")) {
      expect(key).toContain("foo:$enc:");
    }
  });
});
