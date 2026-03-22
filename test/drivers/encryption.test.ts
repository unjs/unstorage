import { describe, expect, it } from "vitest";
import memoryDriver from "../../src/drivers/memory.ts";
import { createStorage, encryptedStorage } from "../../src/index.ts";

describe("encryptedStorage", () => {
  const secret = "e9iF+8pS8qAjnj7B1+ZwdzWQ+KXNJGUPW3HdDuMJPgI=";
  const sivNonce = "ThtnxLK9eCF4OLMg";

  it("encrypts and decrypts values", async () => {
    const storage = encryptedStorage(createStorage({ driver: memoryDriver() }), { secret });

    await storage.setItem("foo", "bar");
    expect(await storage.getItem("foo")).toBe("bar");
  });

  it("supports key encryption", async () => {
    const storage = encryptedStorage(createStorage({ driver: memoryDriver() }), {
      secret,
      encryptKeys: { nonce: sivNonce },
    });

    await storage.setItem("foo/bar", "baz");

    expect(await storage.getItem("foo/bar")).toBe("baz");
    expect(await storage.getKeys()).toEqual(["foo:bar"]);
  });
});
