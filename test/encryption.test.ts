import { describe, expect, it } from "vitest";
import { createStorage, encryptedStorage, prefixStorage } from "../src/index.ts";

describe("encryptedStorage", () => {
  const encryptionKey = "e9iF+8pS8qAjnj7B1+ZwdzWQ+KXNJGUPW3HdDuMJPgI=";

  it("getItems", async () => {
    const storage = encryptedStorage(createStorage(), { encryptionKey });
    await storage.setItem("a", "foo");
    await storage.setItem("b", "bar");

    const items = await storage.getItems(["a", { key: "b", options: { removeMeta: true } }]);
    expect(items).toEqual([
      { key: "a", value: "foo" },
      { key: "b", value: "bar" },
    ]);
  });

  it("setItems", async () => {
    const storage = encryptedStorage(createStorage(), { encryptionKey });
    await storage.setItems([
      { key: "a", value: "foo" },
      { key: "b", value: "bar" },
    ]);
    expect(await storage.getItem("a")).toBe("foo");
    expect(await storage.getItem("b")).toBe("bar");
  });

  it("setItemRaw and getItemRaw", async () => {
    const storage = encryptedStorage(createStorage(), { encryptionKey });
    const raw = new TextEncoder().encode("raw-data");
    await storage.setItemRaw("raw", raw);
    const result = await storage.getItemRaw("raw");
    expect(new TextDecoder().decode(result as Uint8Array)).toBe("raw-data");
  });

  it("getItemRaw returns null for missing key", async () => {
    const storage = encryptedStorage(createStorage(), { encryptionKey });
    expect(await storage.getItemRaw("missing")).toBeNull();
  });

  it("getKeys with base filter and key encryption", async () => {
    const storage = encryptedStorage(createStorage(), { encryptionKey, encryptKeys: true });
    await storage.setItem("foo/a", "1");
    await storage.setItem("bar/b", "2");
    expect(await storage.getKeys("foo")).toStrictEqual(["foo:a"]);
  });

  it("key rotation: reads old values with oldKeys fallback", async () => {
    const oldKey = encryptionKey;
    const newKey = "RHlBd3FzRGFiTEJjb3pNWlRXSUVJSVRMb1FmZDJPaWI=";
    const base = createStorage();

    // Write with old key
    const oldStorage = encryptedStorage(base, { encryptionKey: oldKey });
    await oldStorage.setItem("legacy", "old-data");

    // Rotate: new storage with oldKeys fallback
    const rotated = encryptedStorage(base, { encryptionKey: newKey, oldKeys: [oldKey] });
    expect(await rotated.getItem("legacy")).toBe("old-data");

    // New writes use the new key
    await rotated.setItem("fresh", "new-data");
    expect(await rotated.getItem("fresh")).toBe("new-data");

    // Old storage can't read new entries
    expect(async () => await oldStorage.getItem("fresh")).rejects.toThrow();
  });

  it("key rotation: raw values with oldKeys fallback", async () => {
    const oldKey = encryptionKey;
    const newKey = "RHlBd3FzRGFiTEJjb3pNWlRXSUVJSVRMb1FmZDJPaWI=";
    const base = createStorage();

    const oldStorage = encryptedStorage(base, { encryptionKey: oldKey });
    await oldStorage.setItemRaw("bin", new TextEncoder().encode("raw-old"));

    const rotated = encryptedStorage(base, { encryptionKey: newKey, oldKeys: [oldKey] });
    const result = await rotated.getItemRaw("bin");
    expect(new TextDecoder().decode(result as Uint8Array)).toBe("raw-old");
  });

  it("key rotation: getKeys with encryptKeys and oldKeys", async () => {
    const oldKey = encryptionKey;
    const newKey = "RHlBd3FzRGFiTEJjb3pNWlRXSUVJSVRMb1FmZDJPaWI=";
    const base = createStorage();

    const oldStorage = encryptedStorage(base, { encryptionKey: oldKey, encryptKeys: true });
    await oldStorage.setItem("old-entry", "v1");

    const rotated = encryptedStorage(base, { encryptionKey: newKey, encryptKeys: true, oldKeys: [oldKey] });
    await rotated.setItem("new-entry", "v2");

    const keys = await rotated.getKeys();
    expect(keys).toContain("old-entry");
    expect(keys).toContain("new-entry");
  });

  it("prefixed encryptedStorage", async () => {
    const storage = createStorage();
    const pStorage = prefixStorage(storage, "foo");
    const encStorage = encryptedStorage(pStorage, { encryptionKey });
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
    const encStorage = encryptedStorage(pStorage, { encryptionKey, encryptKeys: true });
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
