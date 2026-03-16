import { describe } from "vitest";
import { resolve } from "node:path";
import encryptionDriver from "../../src/drivers/encryption.ts";
import memoryDriver from "../../src/drivers/memory.ts";
import fsDriver from "../../src/drivers/fs.ts";
import { testDriver } from "./utils.ts";

describe("drivers: encryption", () => {
  const dir = resolve(__dirname, "tmp/fs");
  const encryptionKey = "e9iF+8pS8qAjnj7B1+ZwdzWQ+KXNJGUPW3HdDuMJPgI=";

  testDriver({
    driver: encryptionDriver({
      driver: memoryDriver(),
      encryptionKey,
      keyEncryption: false,
    }),
  });

  testDriver({
    driver: encryptionDriver({
      driver: fsDriver({ base: dir }),
      encryptionKey,
      keyEncryption: false,
    }),
  });
});
