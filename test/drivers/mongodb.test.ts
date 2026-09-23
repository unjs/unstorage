import { afterAll, describe, expect, it } from "vitest";
import driver from "../../src/drivers/mongodb.ts";
import { testDriver } from "./utils.ts";
import { MongoMemoryServer } from "mongodb-memory-server";
import * as mongodb from "mongodb";
import { promisify } from "node:util";

describe("drivers: mongodb", async () => {
  const sleep = promisify(setTimeout);

  const mongoServer = await MongoMemoryServer.create();
  const connectionString = mongoServer.getUri();

  afterAll(async () => {
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  testDriver({
    driver: driver({
      connectionString: connectionString as string,
      databaseName: "test",
      collectionName: "test",
    }),
    additionalTests: (ctx) => {
      it("should throw error if no connection string is provided", async () => {
        await expect(() =>
          driver({
            databaseName: "test",
            collectionName: "test",
          } as any).getItem(""),
        ).rejects.toThrowError("[unstorage] [mongodb] Missing required option `connectionString`.");
      });
      it("should have different dates when an entry was updated", async () => {
        await ctx.storage.setItem("s1:a", "test_data");
        await sleep(100);
        await ctx.storage.setItem("s1:a", "updated_test_data");
        const result = await ctx.storage.getMeta("s1:a");
        expect(result.mtime).not.toBe(result.birthtime);
      });
      it("should close the client on dispose", async () => {
        const clients: TrackedMongoClient[] = [];
        class TrackedMongoClient extends mongodb.MongoClient {
          closeCalls = 0;
          constructor(...args: ConstructorParameters<typeof mongodb.MongoClient>) {
            super(...args);
            clients.push(this);
          }
          override close(force?: boolean) {
            this.closeCalls++;
            return super.close(force);
          }
        }

        const opts = {
          connectionString,
          databaseName: "test",
          collectionName: "dispose",
          lib: { ...mongodb, MongoClient: TrackedMongoClient },
        };

        // Disposing before connecting is a no-op
        await driver(opts).dispose!();
        expect(clients.length).toBe(0);

        const mongoDriver = driver(opts);
        await mongoDriver.setItem!("a", "test_data", {});
        expect(clients.length).toBe(1);

        await mongoDriver.dispose!();
        expect(clients[0]!.closeCalls).toBe(1);

        // Disposing twice is a no-op
        await mongoDriver.dispose!();
        expect(clients[0]!.closeCalls).toBe(1);

        // A new client is created if the driver is used again
        expect(await mongoDriver.getItem!("a", {})).toBe("test_data");
        expect(clients.length).toBe(2);
        await mongoDriver.dispose!();
      });
    },
  });
});
