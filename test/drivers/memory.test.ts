import { describe } from "vitest";
import driver from "../../src/drivers/memory.ts";
import { testDriver } from "./utils.ts";

describe("drivers: memory", () => {
  testDriver({
    driver: driver(),
  });
});
