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
    const client = BlobServiceClient.fromConnectionString("UseDevelopmentStorage=true;");
    const containerClient = client.getContainerClient("unstorage");
    await containerClient.createIfNotExists();
    sasUrl = client.generateAccountSasUrl(
      new Date(Date.now() + 1000 * 60),
      AccountSASPermissions.from({ read: true, list: true, write: true }),
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
        await expect(async () => await invalidStorage.hasItem("test")).rejects.toThrowError(
          "missing accountName",
        );
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

describe("drivers: azure-storage-blob (allowNestedPath)", () => {
  const recordedCalls: { method: string; key?: string; value?: any }[] = [];
  const fakeBlobs = [{ name: "folder/subfolder/file.txt" }, { name: "root.txt" }];

  const mockBlobServiceClient = {
    fromConnectionString: () => ({
      getContainerClient: () => ({
        createIfNotExists: () => Promise.resolve(),
        getBlockBlobClient: (blobKey: string) => ({
          exists: async () => {
            recordedCalls.push({ method: "exists", key: blobKey });
            return true;
          },
          download: async () => {
            recordedCalls.push({ method: "download", key: blobKey });
            return {
              readableStreamBody: {
                on(event: string, handler: any) {
                  if (event === "data") handler(Buffer.from("mock data"));
                  if (event === "end") handler();
                  return this;
                },
              },
            };
          },
          upload: async (value: any) => {
            recordedCalls.push({ method: "upload", key: blobKey, value });
          },
          deleteIfExists: async () => {
            recordedCalls.push({ method: "deleteIfExists", key: blobKey });
          },
          getProperties: async () => {
            recordedCalls.push({ method: "getProperties", key: blobKey });
            return { metadata: { test: "meta" } };
          },
        }),
        listBlobsFlat: (options?: { prefix?: string }) => ({
          async *[Symbol.asyncIterator]() {
            yield {
              segment: {
                blobItems: fakeBlobs.filter((b) =>
                  options?.prefix ? b.name.startsWith(options.prefix) : true,
                ),
              },
            };
          },
          byPage: () => ({
            async *[Symbol.asyncIterator]() {
              yield {
                segment: {
                  blobItems: fakeBlobs.filter((b) =>
                    options?.prefix ? b.name.startsWith(options.prefix) : true,
                  ),
                },
              };
            },
          }),
        }),
      }),
    }),
  };

  const mockLib = {
    BlobServiceClient: mockBlobServiceClient,
    ContainerClient: class {},
    StorageSharedKeyCredential: class {},
  } as any;

  test("translates ':' to '/' when allowNestedPath is true", async () => {
    recordedCalls.length = 0;
    const storage = createStorage({
      driver: driver({
        connectionString: "UseDevelopmentStorage=true;",
        allowNestedPath: true,
        lib: mockLib,
      }),
    });

    await storage.setItem("folder:subfolder:file.txt", "content");
    expect(recordedCalls).toContainEqual({
      method: "upload",
      key: "folder/subfolder/file.txt",
      value: "content",
    });

    await storage.hasItem("folder:subfolder:file.txt");
    expect(recordedCalls).toContainEqual({
      method: "exists",
      key: "folder/subfolder/file.txt",
    });

    const val = await storage.getItem("folder:subfolder:file.txt");
    expect(val).toBe("mock data");
    expect(recordedCalls).toContainEqual({
      method: "download",
      key: "folder/subfolder/file.txt",
    });

    await storage.getMeta("folder:subfolder:file.txt");
    expect(recordedCalls).toContainEqual({
      method: "getProperties",
      key: "folder/subfolder/file.txt",
    });

    await storage.removeItem("folder:subfolder:file.txt");
    expect(recordedCalls).toContainEqual({
      method: "deleteIfExists",
      key: "folder/subfolder/file.txt",
    });

    const keys = await storage.getKeys();
    expect(keys).toEqual(["folder:subfolder:file.txt", "root.txt"]);
  });

  test("preserves ':' when allowNestedPath is false (default)", async () => {
    recordedCalls.length = 0;
    const storage = createStorage({
      driver: driver({
        connectionString: "UseDevelopmentStorage=true;",
        lib: mockLib,
      }),
    });

    await storage.setItem("folder:subfolder:file.txt", "content");
    expect(recordedCalls).toContainEqual({
      method: "upload",
      key: "folder:subfolder:file.txt",
      value: "content",
    });

    await storage.hasItem("folder:subfolder:file.txt");
    expect(recordedCalls).toContainEqual({
      method: "exists",
      key: "folder:subfolder:file.txt",
    });
  });
});
