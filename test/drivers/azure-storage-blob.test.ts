import { describe, expect, beforeAll, afterAll, test } from "vitest";
import { readFile } from "../../src/drivers/utils/node-fs";
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
    additionalTests(ctx) {
      test("properly encodes raw items", async () => {
        const file = await readFile("./test/test.png");

        await ctx.storage.setItemRaw("1.png", file);
        const storedFileNode = await ctx.storage.getItemRaw("1.png");

        expect(storedFileNode).toStrictEqual(file);
      });
    },
  });
});
