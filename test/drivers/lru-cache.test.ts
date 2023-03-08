import { describe } from "vitest";
import driver from "../../src/drivers/lru-cache";
import { testDriver } from "./utils";

describe("drivers: lru-cache", () => {
  testDriver({
    driver: driver(),
  });
});
