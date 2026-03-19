import { describe, expect, it } from "vitest";
import memoryDriver from "../../src/drivers/memory.ts";
import { createStorage, encryptedStorage } from "../../src/index.ts";

describe("encryptedStorage", () => {
  const encryptionKey = "e9iF+8pS8qAjnj7B1+ZwdzWQ+KXNJGUPW3HdDuMJPgI=";

  it("encrypts and decrypts values", async () => {
    const storage = encryptedStorage(
      createStorage({ driver: memoryDriver() }),
      encryptionKey,
    );

    await storage.setItem("foo", "bar");
    expect(await storage.getItem("foo")).toBe("bar");
  });

  it("supports key encryption", async () => {
    const storage = encryptedStorage(
      createStorage({ driver: memoryDriver() }),
      encryptionKey,
      true,
    );

    await storage.setItem("foo/bar", "baz");

    expect(await storage.getItem("foo/bar")).toBe("baz");
    expect(await storage.getKeys()).toEqual(["foo:bar"]);
  });
});
