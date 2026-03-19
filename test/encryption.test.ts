import { describe, expect, it } from "vitest";
import { createStorage, encryptedStorage, prefixStorage } from "../src/index.ts";

describe("encryptedStorage", () => {
  const sivNonce = "ThtnxLK9eCF4OLMg";
  const secret = "e9iF+8pS8qAjnj7B1+ZwdzWQ+KXNJGUPW3HdDuMJPgI=";

  it("getItems", async () => {
    const storage = encryptedStorage(createStorage(), { secret });
    await storage.setItem("a", "foo");
    await storage.setItem("b", "bar");

    const items = await storage.getItems(["a", { key: "b", options: { removeMeta: true } }]);
    expect(items).toEqual([
      { key: "a", value: "foo" },
      { key: "b", value: "bar" },
    ]);
  });

  it("setItems", async () => {
    const storage = encryptedStorage(createStorage(), { secret });
    await storage.setItems([
      { key: "a", value: "foo" },
      { key: "b", value: "bar" },
    ]);
    expect(await storage.getItem("a")).toBe("foo");
    expect(await storage.getItem("b")).toBe("bar");
  });

  it("setItemRaw and getItemRaw", async () => {
    const storage = encryptedStorage(createStorage(), { secret });
    const raw = new TextEncoder().encode("raw-data");
    await storage.setItemRaw("raw", raw);
    const result = await storage.getItemRaw("raw");
    expect(new TextDecoder().decode(result as Uint8Array)).toBe("raw-data");
  });

  it("getItemRaw returns null for missing key", async () => {
    const storage = encryptedStorage(createStorage(), { secret });
    expect(await storage.getItemRaw("missing")).toBeNull();
  });

  it("getKeys with base filter and key encryption", async () => {
    const storage = encryptedStorage(createStorage(), { secret, encryptKeys: { nonce: sivNonce } });
    await storage.setItem("foo/a", "1");
    await storage.setItem("bar/b", "2");
    expect(await storage.getKeys("foo")).toStrictEqual(["foo:a"]);
  });

  it("key rotation: reads old values with oldSecrets fallback", async () => {
    const oldSecret = secret;
    const newSecret = "RHlBd3FzRGFiTEJjb3pNWlRXSUVJSVRMb1FmZDJPaWI=";
    const base = createStorage();

    // Write with old secret
    const oldStorage = encryptedStorage(base, { secret: oldSecret });
    await oldStorage.setItem("legacy", "old-data");

    // Rotate: new storage with oldSecrets fallback
    const rotated = encryptedStorage(base, { secret: [newSecret, oldSecret] });
    expect(await rotated.getItem("legacy")).toBe("old-data");

    // New writes use the new secret
    await rotated.setItem("fresh", "new-data");
    expect(await rotated.getItem("fresh")).toBe("new-data");

    // Old storage can't read new entries
    expect(async () => await oldStorage.getItem("fresh")).rejects.toThrow();
  });

  it("key rotation: raw values with oldSecrets fallback", async () => {
    const oldSecret = secret;
    const newSecret = "RHlBd3FzRGFiTEJjb3pNWlRXSUVJSVRMb1FmZDJPaWI=";
    const base = createStorage();

    const oldStorage = encryptedStorage(base, { secret: oldSecret });
    await oldStorage.setItemRaw("bin", new TextEncoder().encode("raw-old"));

    const rotated = encryptedStorage(base, { secret: [newSecret, oldSecret] });
    const result = await rotated.getItemRaw("bin");
    expect(new TextDecoder().decode(result as Uint8Array)).toBe("raw-old");
  });

  it("key rotation: getKeys with encryptKeys and oldSecrets", async () => {
    const oldSecret = secret;
    const newSecret = "RHlBd3FzRGFiTEJjb3pNWlRXSUVJSVRMb1FmZDJPaWI=";
    const base = createStorage();

    const oldStorage = encryptedStorage(base, {
      secret: oldSecret,
      encryptKeys: { nonce: sivNonce },
    });
    await oldStorage.setItem("old-entry", "v1");

    const rotated = encryptedStorage(base, {
      secret: [newSecret, oldSecret],
      encryptKeys: { nonce: sivNonce },
    });
    await rotated.setItem("new-entry", "v2");

    const keys = await rotated.getKeys();
    expect(keys).toContain("old-entry");
    expect(keys).toContain("new-entry");
  });

  it("getKeys skips non-prefixed keys without crashing", async () => {
    const base = createStorage();

    // Write a plain (unencrypted) key directly to the underlying storage
    await base.setItem("plain-key", "plain-value");

    const encStorage = encryptedStorage(base, { secret, encryptKeys: { nonce: sivNonce } });
    await encStorage.setItem("my-secret", "encrypted-value");

    // getKeys should return both: the non-prefixed key as-is and the decrypted key
    const keys = await encStorage.getKeys();
    expect(keys).toContain("plain-key");
    expect(keys).toContain("my-secret");
  });

  it("handles large values without stack overflow", async () => {
    const storage = encryptedStorage(createStorage(), { secret });
    const largeValue = "x".repeat(200_000);
    await storage.setItem("large", largeValue);
    expect(await storage.getItem("large")).toBe(largeValue);
  });

  it("handles large raw values without stack overflow", async () => {
    const storage = encryptedStorage(createStorage(), { secret });
    const largeRaw = new Uint8Array(200_000).fill(42);
    await storage.setItemRaw("large-raw", largeRaw);
    const result = await storage.getItemRaw("large-raw");
    expect(new Uint8Array(result as Uint8Array)).toStrictEqual(largeRaw);
  });

  it("rejects invalid key length", () => {
    expect(() =>
      encryptedStorage(createStorage(), { secret: globalThis.btoa("too-short") }),
    ).toThrow("Encryption key must be exactly 32 bytes");
  });

  it("rejects invalid SIV nonce length", () => {
    expect(() =>
      encryptedStorage(createStorage(), {
        secret,
        encryptKeys: { nonce: globalThis.btoa("bad") },
      }),
    ).toThrow("SIV nonce must be exactly 12 bytes");
  });

  it("prefixed encryptedStorage", async () => {
    const storage = createStorage();
    const pStorage = prefixStorage(storage, "foo");
    const encStorage = encryptedStorage(pStorage, { secret });
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
    const encStorage = encryptedStorage(pStorage, { secret, encryptKeys: { nonce: sivNonce } });
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
