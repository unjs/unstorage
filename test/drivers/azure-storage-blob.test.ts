import { describe, it, expect, beforeAll, afterAll } from "vitest";
import driver from "../../src/drivers/azure-storage-blob";
import { testDriver } from "./utils";
import { BlobServiceClient } from "@azure/storage-blob";
import { ChildProcess, exec } from "child_process";

describe("drivers: azure-storage-blob", () => {
  // let azuriteProcess: ChildProcess;
  beforeAll(async () => {
    // azuriteProcess = exec("npm run azurite-blob-storage");
    const client = BlobServiceClient.fromConnectionString(
      "UseDevelopmentStorage=true"
    );
    const containerClient = client.getContainerClient("unstorage");
    await containerClient.createIfNotExists();
  });
  testDriver({
    driver: driver({
      connectionString: "UseDevelopmentStorage=true",
      accountName: "local",
    }),
  });
  afterAll(() => {
    // azuriteProcess.kill(9);
  });
});
