import { describe } from "vitest";
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
