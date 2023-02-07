import { describe, it, expect, beforeAll, afterAll } from "vitest";
import driver from "../../src/drivers/azure-storage-table";
import { testDriver } from "./utils";
import { TableClient } from "@azure/data-tables";

describe("drivers: azure-storage-table", () => {
  beforeAll(async () => {
    const client = TableClient.fromConnectionString(
      "UseDevelopmentStorage=true",
      "unstorage"
    );
    await client.createTable();
  });
  testDriver({
    driver: driver({ connectionString: "UseDevelopmentStorage=true" }),
  });
});
