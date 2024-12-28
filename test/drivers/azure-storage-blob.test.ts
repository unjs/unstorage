import { describe, beforeAll, afterAll, it, expect } from "vitest";
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
      it("supports depth in getKeys", async () => {
        await ctx.storage.setItem("depth-test/key0", "boop");
        await ctx.storage.setItem("depth-test/depth0/key1", "boop");
        await ctx.storage.setItem("depth-test/depth0/depth1/key2", "boop");
        await ctx.storage.setItem("depth-test/depth0/depth1/key3", "boop");

        const depth1Result = await ctx.storage.getKeys(undefined, {
          depth: 1,
        });
        const depth2Result = await ctx.storage.getKeys(undefined, {
          depth: 2,
        });

        expect(depth1Result).includes.members(["depth-test:key0"]);
        expect(depth1Result).not.include.members([
          "depth-test:depth0:key1",
          "depth-test:depth0:depth1:key2",
          "depth-test:depth0:depth1:key3",
        ]);
        expect(depth2Result).includes.members([
          "depth-test:key0",
          "depth-test:depth0:key1",
        ]);
        expect(depth2Result).not.include.members([
          "depth-test:depth0:depth1:key2",
          "depth-test:depth0:depth1:key3",
        ]);
      });
    },
  });
});
