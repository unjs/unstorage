import { describe } from "vitest";
import driver from "../../src/drivers/sqlite";
import { testDriver } from "./utils";

describe("drivers: sqlite", () => {
  testDriver({
    driver: driver(),
  });
});
