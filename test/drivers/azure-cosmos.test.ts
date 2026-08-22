import { describe, expect, it } from "vitest";
import driver from "../../src/drivers/azure-cosmos.ts";
import { testDriver } from "./utils.ts";

describe.skip("drivers: azure-cosmos", () => {
  testDriver({
    driver: driver({
      endpoint: "COSMOS_DB_ENDPOINT",
      accountKey: "COSMOS_DB_KEY",
    }),
  });
});

describe("drivers: azure-cosmos (dispose)", () => {
  // Minimal `@azure/cosmos` stand-in: the driver only needs to reach a container.
  function createFakeLib() {
    const clients: { disposeCalls: number }[] = [];
    const container = {
      item: () => ({
        read: async () => ({ resource: undefined }),
      }),
      items: {
        upsert: async () => {},
      },
    };
    class CosmosClient {
      disposeCalls = 0;
      databases = {
        createIfNotExists: async () => ({
          database: {
            containers: {
              createIfNotExists: async () => ({ container }),
            },
          },
        }),
      };
      constructor() {
        clients.push(this);
      }
      dispose() {
        this.disposeCalls++;
      }
    }
    return { clients, lib: { CosmosClient } as any };
  }

  it("disposes the CosmosClient", async () => {
    const { clients, lib } = createFakeLib();
    const opts = {
      endpoint: "https://example.documents.azure.com:443/",
      accountKey: "key",
      lib,
    };

    // Disposing before connecting is a no-op
    await driver(opts).dispose!();
    expect(clients.length).toBe(0);

    const cosmosDriver = driver(opts);
    await cosmosDriver.setItem!("a", "test_data", {});
    expect(clients.length).toBe(1);

    await cosmosDriver.dispose!();
    expect(clients[0]!.disposeCalls).toBe(1);

    // Disposing twice is a no-op
    await cosmosDriver.dispose!();
    expect(clients[0]!.disposeCalls).toBe(1);

    // A new client is created if the driver is used again
    await cosmosDriver.hasItem!("a", {});
    expect(clients.length).toBe(2);
    await cosmosDriver.dispose!();
    expect(clients[1]!.disposeCalls).toBe(1);
  });

  it("disposes a client created while initialization is pending", async () => {
    const { clients, lib } = createFakeLib();
    let releaseLib!: () => void;
    const libLoaded = new Promise<void>((resolve) => {
      releaseLib = resolve;
    });

    const cosmosDriver = driver({
      endpoint: "https://example.documents.azure.com:443/",
      accountKey: "key",
      lib: async () => {
        await libLoaded;
        return lib;
      },
    });

    // Start initialization, then dispose while it is still in-flight
    const pending = cosmosDriver.setItem!("a", "test_data", {});
    expect(clients.length).toBe(0);
    const disposed = cosmosDriver.dispose!();

    releaseLib();
    await pending;
    await disposed;

    // The client created by the in-flight initialization is disposed exactly once
    expect(clients.length).toBe(1);
    expect(clients[0]!.disposeCalls).toBe(1);
  });
});
