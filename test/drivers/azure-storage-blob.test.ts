import { describe, expect, beforeAll, afterAll, test } from "vitest";
import driver from "../../src/drivers/azure-storage-blob.ts";
import { testDriver } from "./utils.ts";
import { AccountSASPermissions, BlobServiceClient } from "@azure/storage-blob";
import { ChildProcess, exec } from "node:child_process";
import { createStorage } from "../../src/index.ts";

describe.skip("drivers: azure-storage-blob", () => {
  let azuriteProcess: ChildProcess;
  let sasUrl: string;
  beforeAll(async () => {
    azuriteProcess = exec("pnpm exec azurite-blob --silent");
    const client = BlobServiceClient.fromConnectionString(
      "UseDevelopmentStorage=true;"
    );
    const containerClient = client.getContainerClient("unstorage");
    await containerClient.createIfNotExists();
    sasUrl = client.generateAccountSasUrl(
      new Date(Date.now() + 1000 * 60),
      AccountSASPermissions.from({ read: true, list: true, write: true })
    );
  });
  afterAll(() => {
    azuriteProcess.kill(9);
  });
  testDriver({
    driver: driver({
      connectionString: "UseDevelopmentStorage=true;",
      accountName: "devstoreaccount1",
    }),
    additionalTests() {
      test("no empty account name", async () => {
        const invalidStorage = createStorage({
          driver: driver({
            accountKey: "UseDevelopmentStorage=true",
          } as any),
        });
        await expect(
          async () => await invalidStorage.hasItem("test")
        ).rejects.toThrowError("missing accountName");
      });
      test("sas key", async ({ skip }) => {
        if (
          !process.env.AZURE_STORAGE_BLOB_SAS_KEY ||
          !process.env.AZURE_STORAGE_BLOB_ACCOUNT_NAME
        ) {
          skip();
        }
        const storage = createStorage({
          driver: driver({
            sasKey: process.env.AZURE_STORAGE_BLOB_SAS_KEY,
            accountName: process.env.AZURE_STORAGE_BLOB_ACCOUNT_NAME,
            containerName: "unstorage",
          }),
        });
        await storage.getKeys();
      });
      test("sas url", async () => {
        const storage = createStorage({
          driver: driver({
            sasUrl,
            containerName: "unstorage",
          }),
        });
        await storage.getKeys();
      });
      test("account key", async ({ skip }) => {
        if (
          !process.env.AZURE_STORAGE_BLOB_ACCOUNT_KEY ||
          !process.env.AZURE_STORAGE_BLOB_ACCOUNT_NAME
        ) {
          skip();
        }
        const storage = createStorage({
          driver: driver({
            accountName: process.env.AZURE_STORAGE_BLOB_ACCOUNT_NAME,
            accountKey: process.env.AZURE_STORAGE_BLOB_ACCOUNT_KEY,
          }),
        });
        await storage.getKeys();
      });
      test("use DefaultAzureCredential", async ({ skip }) => {
        if (!process.env.AZURE_STORAGE_BLOB_ACCOUNT_NAME) {
          skip();
        }
        const storage = createStorage({
          driver: driver({
            accountName: process.env.AZURE_STORAGE_BLOB_ACCOUNT_NAME,
            containerName: "unstorage",
          }),
        });
        await storage.getKeys();
      });
    },
  });
});
