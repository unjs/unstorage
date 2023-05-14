import { describe, it, expect, vi } from "vitest";
import driver from "../../src/drivers/idb-keyval";
import { testDriver } from "./utils";
import 'fake-indexeddb/auto'

describe("drivers: idb-keyval", () => {
  testDriver({
    driver: driver(),
  });
});
