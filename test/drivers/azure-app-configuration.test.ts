import { describe } from "vitest";
import driver from "../../src/drivers/azure-app-configuration";
import { testDriver } from "./utils";

describe("drivers: azure-app-configuration", () => {
  testDriver({
    driver: driver({
      appConfigName: "unstoragetest",
      label: "dev",
      prefix: "app01",
    }),
  });
});
