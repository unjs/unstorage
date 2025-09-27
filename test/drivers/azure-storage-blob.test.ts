import {
  afterEach,
  describe,
  expect,
  beforeAll,
  afterAll,
  test,
  vi,
} from "vitest";
import driver from "../../src/drivers/azure-storage-blob";
import { testDriver } from "./utils";
import { AccountSASPermissions, BlobServiceClient } from "@azure/storage-blob";
import { ChildProcess, exec } from "node:child_process";
import { createStorage } from "../../src";
import { ContainerClient } from "@azure/storage-blob";

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
  afterEach(() => {
    vi.restoreAllMocks();
  });
  testDriver({
    driver: driver({
      connectionString: "UseDevelopmentStorage=true;",
      accountName: "devstoreaccount1",
    }),
    additionalTests(ctx) {
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
      test("throws when no account name", async () => {
        const badDriver = driver({
          connectionString: "UseDevelopmentStorage=true",
          accountName: "",
        });
        expect(() => {
          // trigger initialisation of the client
          badDriver.getInstance?.();
        }).toThrow("[unstorage] [azure-storage-blob] accountName");
      });
      test("native meta", async () => {
        await ctx.storage.setItem("foo:bar", "test_data");
        const meta = await ctx.storage.getMeta("foo:bar");
        // undefined because we didn't access it yet
        expect(meta.atime).toBe(undefined);
        expect(meta.mtime?.constructor.name).toBe("Date");
      });
      test("natively supports depth in getKeys", async () => {
        const spy = vi.spyOn(ContainerClient.prototype, "listBlobsByHierarchy");

        await ctx.storage.setItem("depth-test/key0", "boop");
        await ctx.storage.setItem("depth-test/depth0/key1", "boop");
        await ctx.storage.setItem("depth-test/depth0/depth1/key2", "boop");
        await ctx.storage.setItem("depth-test/depth0/depth1/key3", "boop");

        expect(
          (
            await ctx.driver.getKeys("", {
              maxDepth: 1,
            })
          ).sort()
        ).toMatchObject(["depth-test:key0"]);

        // assert that the underlying blob storage was only called upto 1 depth
        // to confirm the native filtering was used
        expect(spy).toHaveBeenCalledTimes(2);
        expect(spy).toHaveBeenCalledWith(":", {
          // azure actually mutates `options` and sets `prefix` to
          // `undefined` even though we pass it in as `""`. it seems this
          // assertion works by reference, so we see the mutated value
          prefix: undefined,
        });
        expect(spy).toHaveBeenCalledWith(":", {
          prefix: "depth-test:",
        });

        spy.mockClear();

        expect(
          (
            await ctx.driver.getKeys("", {
              maxDepth: 2,
            })
          ).sort()
        ).toMatchObject(["depth-test:depth0:key1", "depth-test:key0"]);

        expect(spy).toHaveBeenCalledTimes(3);
        expect(spy).toHaveBeenCalledWith(":", {
          prefix: undefined,
        });
        expect(spy).toHaveBeenCalledWith(":", {
          prefix: "depth-test:",
        });
        expect(spy).toHaveBeenCalledWith(":", {
          prefix: "depth-test:depth0:",
        });
      });
    },
  });
});
