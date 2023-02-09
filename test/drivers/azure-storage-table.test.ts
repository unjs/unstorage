import { describe, it, expect, beforeAll, afterAll } from "vitest";
import driver from "../../src/drivers/azure-storage-table";
import { testDriver } from "./utils";
import { TableClient } from "@azure/data-tables";
import { ChildProcess, exec } from "child_process";

describe("drivers: azure-storage-table", () => {
  let azuriteProcess: ChildProcess;
  beforeAll(async () => {
    azuriteProcess = exec("npm run azurite-table-storage");
    const client = TableClient.fromConnectionString(
      "UseDevelopmentStorage=true",
      "unstorage"
    );
    await client.createTable();
  });
  testDriver({
    driver: driver({
      connectionString: "UseDevelopmentStorage=true",
      accountName: "local",
    }),
  });
  afterAll(() => {
    azuriteProcess.kill(9);
  });
});
