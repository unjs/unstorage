import { describe, beforeAll, afterAll } from "vitest";
import driver from "../../src/drivers/http";
import { createStorage } from "../../src";
import { createStorageServer } from "../../src/server";
import { listen } from "listhen";
import { testDriver } from "./utils";

describe("drivers: http", async () => {
  const remoteStorage = createStorage();
  const server = createStorageServer(remoteStorage);
  const listener = await listen(server.handle, {
    port: { random: true },
  });

  afterAll(async () => {
    await listener.close();
  });

  testDriver({
    driver: driver({ base: listener!.url }),
  });
});
