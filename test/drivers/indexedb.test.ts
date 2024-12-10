import { describe, expect, it } from "vitest";
import driver from "../../src/drivers/indexedb";
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
  
  it("properly handle raw items", async () => {
    await customStorage.setItem("object", { item: "foo" });
    await customStorage.setItemRaw("rawObject", { item: "foo" });
    expect(await customStorage.getItemRaw("object")).toBe("{\"item\":\"foo\"}");
    expect(await customStorage.getItemRaw("rawObject")).toStrictEqual({ item: "foo" });
    await customStorage.setItem("number", 1234);
    await customStorage.setItemRaw("rawNumber", 1234);
    expect(await customStorage.getItemRaw("number")).toBe("1234");
    expect(await customStorage.getItemRaw("rawNumber")).toBe(1234);
    await customStorage.setItem("boolean", true);
    await customStorage.setItemRaw("rawBoolean", true);
    expect(await customStorage.getItemRaw("boolean")).toBe("true");
    expect(await customStorage.getItemRaw("rawBoolean")).toBe(true);
  })
});
