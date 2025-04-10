import {
  describe,
  beforeAll,
  afterAll,
  it,
  expect,
  vi,
  afterEach,
} from "vitest";
import driver from "../../src/drivers/azure-storage-blob";
import { testDriver } from "./utils";
import { BlobServiceClient } from "@azure/storage-blob";
import { ChildProcess, exec } from "node:child_process";
import { ContainerClient } from "@azure/storage-blob";

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
  afterEach(() => {
    vi.restoreAllMocks();
  });
  testDriver({
    driver: driver({
      connectionString: "UseDevelopmentStorage=true",
      accountName: "local",
    }),
    additionalTests(ctx) {
      it("throws when no account name", async () => {
        const badDriver = driver({
          connectionString: "UseDevelopmentStorage=true",
          accountName: "",
        });
        expect(() => {
          // trigger initialisation of the client
          badDriver.getInstance?.();
        }).toThrow("[unstorage] [azure-storage-blob] accountName");
      });

      it("native meta", async () => {
        await ctx.storage.setItem("foo:bar", "test_data");
        const meta = await ctx.storage.getMeta("foo:bar");
        // undefined because we didn't access it yet
        expect(meta.atime).toBe(undefined);
        expect(meta.mtime?.constructor.name).toBe("Date");
      });

      it("natively supports depth in getKeys", async () => {
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
