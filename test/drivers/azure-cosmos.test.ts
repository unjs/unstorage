import { describe, expect, it } from "vitest";
import * as cosmos from "@azure/cosmos";
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

describe("drivers: azure-cosmos (fake)", () => {
  it("should dispose the client on dispose", async () => {
    const clients: FakeCosmosClient[] = [];

    // Minimal fake of `CosmosClient`, just enough surface for the driver to resolve
    // a container without reaching a real Cosmos DB account.
    class FakeCosmosClient {
      disposeCalls = 0;
      databases = {
        createIfNotExists: async () => ({
          database: {
            containers: {
              createIfNotExists: async () => ({
                container: { item: () => ({ read: async () => ({}) }) },
              }),
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

    const opts = {
      endpoint: "https://localhost:8081",
      accountKey: "test",
      lib: { ...cosmos, CosmosClient: FakeCosmosClient as any },
    };

    // Disposing before connecting is a no-op
    await driver(opts).dispose!();
    expect(clients.length).toBe(0);

    const cosmosDriver = driver(opts);
    expect(await cosmosDriver.getItem!("a", {})).toBe(null);
    expect(clients.length).toBe(1);

    await cosmosDriver.dispose!();
    expect(clients[0]!.disposeCalls).toBe(1);

    // Disposing twice is a no-op
    await cosmosDriver.dispose!();
    expect(clients[0]!.disposeCalls).toBe(1);

    // A new client is created if the driver is used again
    expect(await cosmosDriver.getItem!("a", {})).toBe(null);
    expect(clients.length).toBe(2);
    await cosmosDriver.dispose!();
  });
});
