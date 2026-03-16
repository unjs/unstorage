import { describe, expect, it } from "vitest";
import encryptionDriver from "../../src/drivers/encryption.ts";
import memoryDriver from "../../src/drivers/memory.ts";
import { createStorage } from "../../src/index.ts";
import { testDriver } from "./utils.ts";

describe("drivers: encryption", () => {
  const encryptionKey = "e9iF+8pS8qAjnj7B1+ZwdzWQ+KXNJGUPW3HdDuMJPgI=";

  testDriver({
    driver: encryptionDriver({
      driver: memoryDriver(),
      encryptionKey,
    }),
  });

  it("supports key encryption", async () => {
    const storage = createStorage({
      driver: encryptionDriver({
        driver: memoryDriver(),
        encryptionKey,
        keyEncryption: true,
      }),
    });

    await storage.setItem("foo/bar", "baz");

    expect(await storage.getItem("foo/bar")).toBe("baz");
    expect(await storage.getKeys()).toEqual(["foo:bar"]);
  });
});
