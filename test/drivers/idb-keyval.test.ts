import { describe, expect, it } from "vitest";
import driver from "../../src/drivers/idb-keyval";
import { testDriver } from "./utils";
import "fake-indexeddb/auto";
import { createStorage } from "../../src";

describe("drivers: indexeddb", () => {
  testDriver({ driver: driver({ dbName: "test-db" }) });

  const customStorage = createStorage({
    driver: driver({
      dbName: "custom-db",
      storeName: "custom-name",
      base: "unstorage",
    }),
  });

  it("can use a customStore", async () => {
    await customStorage.setItem("first", "foo");
    await customStorage.setItem("second", "bar");
    expect(await customStorage.getItem("first")).toBe("foo");
    await customStorage.removeItem("first");
    expect(await customStorage.getKeys()).toMatchObject(["unstorage:second"]);
    await customStorage.clear();
    expect(await customStorage.hasItem("second")).toBe(false);
  });
});
