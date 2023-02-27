import { describe } from "vitest";
import driver from "../../src/drivers/azure-cosmos";
import { testDriver } from "./utils";

describe.skip("drivers: azure-cosmos", () => {
  testDriver({
    driver: driver({
      endpoint: "COSMOS_DB_ENDPOINT",
      accountKey: "COSMOS_DB_KEY",
    }),
  });
});
