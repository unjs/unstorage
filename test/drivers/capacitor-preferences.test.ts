import { describe } from "vitest";
import driver from "../../src/drivers/capacitor-preferences";
import { testDriver } from "./utils";

describe("drivers: capacitor-preferences", () => {
  testDriver({
    driver: driver({}),
  });
});
