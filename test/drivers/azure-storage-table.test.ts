import { describe, it, expect, beforeAll, afterAll } from "vitest";
import driver from "../../src/drivers/azure-storage-table";
import { testDriver } from "./utils";
import { TableClient } from "@azure/data-tables";
import { ChildProcess, exec } from "child_process";
import { promisify } from "util";

const sleep = promisify(setTimeout);

describe("drivers: azure-storage-table", () => {
  let azuriteProcess: ChildProcess;
  beforeAll(async () => {
    azuriteProcess = exec("npm run azurite-table-storage");
    // Wait for Azurite to start
    sleep(1000);
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
    azuriteProcess.kill();
  });
});
