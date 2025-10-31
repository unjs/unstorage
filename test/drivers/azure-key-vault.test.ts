import { describe } from "vitest";
import driver from "../../src/drivers/azure-key-vault";
import { testDriver } from "./utils";

describe.skip("drivers: azure-key-vault", { timeout: 80_000 }, () => {
  testDriver({
    driver: driver({ vaultName: "testunstoragevault" }),
  });
}); // 60s as the Azure Key Vault need to delete and purge the secret before it can be created again.
