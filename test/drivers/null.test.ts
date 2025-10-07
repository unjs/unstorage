import { describe, expect, it } from "vitest";
import driver from "../../src/drivers/null.ts";
import { createStorage } from "../../src/index.ts";

describe("drivers: null", async () => {
  const storage = createStorage({ driver: driver() });
  it("setItem", async () => {
    await storage.setItem("key", "value");
  });
  it("getItem", async () => {
    expect(await storage.getItem("key")).toEqual(null);
  });
});
