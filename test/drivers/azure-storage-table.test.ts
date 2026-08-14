import { describe, beforeAll, afterAll } from "vitest";
import driver from "../../src/drivers/azure-storage-table.ts";
import { testDriver } from "./utils.ts";
import { TableClient } from "@azure/data-tables";
import { ChildProcess, exec } from "node:child_process";

describe.skip("drivers: azure-storage-table", () => {
  let azuriteProcess: ChildProcess;

  beforeAll(async () => {
    azuriteProcess = exec("npx azurite-table --silent");
    const client = TableClient.fromConnectionString("UseDevelopmentStorage=true", "unstorage");
    await client.createTable();
  });

  afterAll(() => {
    azuriteProcess.kill(9);
  });

  testDriver({
    driver: driver({
      connectionString: "UseDevelopmentStorage=true",
      accountName: "local",
    }),
  });
});
