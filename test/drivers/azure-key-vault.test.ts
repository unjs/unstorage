import { describe } from "vitest";
import driver from "../../src/drivers/azure-key-vault";
import { testDriver } from "./utils";

describe(
  "drivers: azure-key-vault",
  () => {
    testDriver({
      driver: driver({ vaultName: "testunstoragevault" }),
    });
  },
  { timeout: 80000 }
); // 60s as the Azure Key Vault need to delete and purge the secret before it can be created again.
