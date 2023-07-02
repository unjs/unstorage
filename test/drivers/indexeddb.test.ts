import { describe } from "vitest";
import driver from "../../src/drivers/indexeddb";
import { testDriver } from "./utils";
import "fake-indexeddb/auto";

describe("drivers: indexeddb", () => {
  testDriver({
    driver: driver({ dbName: "test-db" }),
  });
});
