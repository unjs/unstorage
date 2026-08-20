import { describe } from "vitest";
import driver from "../../src/drivers/azure-app-configuration.ts";
import { testDriver } from "./utils.ts";

describe.skip("drivers: azure-app-configuration", () => {
  testDriver({
    driver: driver({
      appConfigName: "unstoragetest",
      label: "dev",
      prefix: "app01",
    }),
  });
});
