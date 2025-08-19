import { describe, it, expect } from "vitest";
import { createStorage } from "../../src";
import vercelRuntimeCacheDriver from "../../src/drivers/vercel-cache";

describe("drivers: vercel-cache", async () => {
  const storage = createStorage({
    driver: vercelRuntimeCacheDriver({
      base: Math.round(Math.random() * 1_000_000).toString(16),
      // Configure tags so clear() can expire them
      tags: ["unstorage-test"],
    }),
  });

  it("set/get/has/remove", async () => {
    expect(await storage.hasItem("k1")).toBe(false);
    await storage.setItem("k1", "v1");
    expect(await storage.hasItem("k1")).toBe(true);
    expect(await storage.getItem("k1")).toBe("v1");
    await storage.removeItem("k1");
    expect(await storage.hasItem("k1")).toBe(false);
    expect(await storage.getItem("k1")).toBe(null);
  });

  it("getMeta returns {} for existing and null for missing", async () => {
    await storage.setItem("meta-key", "meta-value");
    expect(await storage.getMeta("meta-key")).toMatchObject({});
    await storage.removeItem("meta-key");
    expect(await storage.getItem("meta-key")).toBe(null);
    expect(await storage.hasItem("meta-key")).toBe(false);
  });

  it("getKeys is not supported (returns empty list)", async () => {
    await storage.setItem("a", "1");
    await storage.setItem("b", "2");
    expect(await storage.getKeys()).toMatchObject([]);
  });

  it("clear expires by tags when configured", async () => {
    await storage.setItem("t:1", "v");
    expect(await storage.getItem("t:1")).toBe("v");
    await storage.clear();
    expect(await storage.getItem("t:1")).toBe(null);
  });
});
