import { describe, expect, it } from "vitest";
import appwriteTablesDbDriver from "../../src/drivers/appwrite-tables-db.ts";
import { testDriver, type TestContext } from "./utils.ts";
import { provideTestTable, keyOptions } from "./appwrite.fixture.ts";
import { createAppwriteClient } from "../../src/drivers/utils/appwrite.ts";

const endpoint = process.env.VITE_APPWRITE_ENDPOINT;
const projectId = process.env.VITE_APPWRITE_PROJECT_ID;
const databaseId = process.env.VITE_APPWRITE_DATABASE_ID;
const apiKey = process.env.VITE_APPWRITE_API_KEY;

describe.skipIf(!endpoint || !projectId || !databaseId)(
  "drivers: appwrite-tablesdb",
  () => {
    const additionalTests = (ctx: TestContext) => {
      it("upsert item", async () => {
        await ctx.storage.setItem("l0:l1:l2", "initial_value");
        await ctx.storage.setItem("l0:l1:l2", "new_value");
        expect(await ctx.storage.getItem("l0:l1:l2")).toBe("new_value");
      });
    };

    const client = createAppwriteClient({
      endpoint: endpoint!,
      projectId: projectId!,
      apiKey,
    });

    describe("key attribute: '$id' (default)", (test) => {
      const tableId = provideTestTable(test, {
        client,
        databaseId: databaseId!,
        tableName: "unstorage_test_key_default",
      });

      testDriver({
        driver: () =>
          appwriteTablesDbDriver({
            client,
            databaseId: databaseId!,
            tableId,
            ...keyOptions,
          }),
        additionalTests,
      });
    });

    describe("key attribute: 'key' (custom)", (test) => {
      const customKeyAttribute = "primary_key";

      const tableId = provideTestTable(test, {
        client,
        databaseId: databaseId!,
        tableName: "unstorage_test_key_custom",
        keyColumn: {
          key: customKeyAttribute,
          type: "string",
          size: 64,
        },
        keyIndex: {
          key: "unique_primary_key",
          type: "unique",
          attributes: [customKeyAttribute],
        },
      });

      testDriver({
        driver: () =>
          appwriteTablesDbDriver({
            client,
            databaseId: databaseId!,
            tableId,
            attributes: {
              key: customKeyAttribute,
              value: "value",
            },
          }),
        additionalTests,
      });
    });
  }
);
