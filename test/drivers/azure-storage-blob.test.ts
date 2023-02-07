import { describe, it, expect, beforeAll, afterAll } from "vitest";
import driver from "../../src/drivers/azure-storage-blob";
import { testDriver } from "./utils";
import { BlobServiceClient } from "@azure/storage-blob";

describe("drivers: azure-storage-blob", () => {
  beforeAll(async () => {
    const client = BlobServiceClient.fromConnectionString(
      "UseDevelopmentStorage=true"
    );
    await client.createContainer("unstorage");
  });
  testDriver({
    driver: driver({
      connectionString: "UseDevelopmentStorage=true",
      accountName: "local",
    }),
  });
});
