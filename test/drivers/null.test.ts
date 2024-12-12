import { describe, expect, it } from "vitest";
import driver from "../../src/drivers/null";
import { createStorage } from "../../src";

describe("drivers: null", async () => {
  const storage = createStorage({ driver: driver() });
  it("setItem", async () => {
    await storage.setItem("key", "value");
  });
  it("getItem", async () => {
    expect(await storage.getItem("key")).toEqual(null);
  });
});
