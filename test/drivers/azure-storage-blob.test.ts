import { describe, beforeAll, afterAll } from "vitest";
import driver from "../../src/drivers/azure-storage-blob";
import { testDriver } from "./utils";
import { BlobServiceClient } from "@azure/storage-blob";
import { ChildProcess, exec } from "node:child_process";

describe.skip("drivers: azure-storage-blob", () => {
  let azuriteProcess: ChildProcess;
  beforeAll(async () => {
    azuriteProcess = exec("npx azurite-blob --silent");
    const client = BlobServiceClient.fromConnectionString(
      "UseDevelopmentStorage=true"
    );
    const containerClient = client.getContainerClient("unstorage");
    await containerClient.createIfNotExists();
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
