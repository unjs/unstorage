import { afterAll, describe, expect, it } from "vitest";
import driver from "../../src/drivers/mongodb";
import { testDriver } from "./utils";
import { MongoMemoryServer } from "mongodb-memory-server";
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
          } as any).getItem("")
        ).rejects.toThrowError(
          "[unstorage] [mongodb] Missing required option `connectionString`."
        );
      });
      it("should have different dates when an entry was updated", async () => {
        await ctx.storage.setItem("s1:a", "test_data");
        await sleep(100);
        await ctx.storage.setItem("s1:a", "updated_test_data");
        const result = await ctx.storage.getMeta("s1:a");
        expect(result.mtime).not.toBe(result.birthtime);
      });
    },
  });
});
