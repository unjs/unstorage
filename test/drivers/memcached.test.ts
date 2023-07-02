import { describe, it, expect } from "vitest";
import memcachedDriver from "../../src/drivers/memcached";
import { createStorage } from "../../src";
import { testDriver } from "./utils";

describe("Memcached storage", () => {
  const driver = memcachedDriver({
    serverLocation: "localhost:11211",
    connectionOptions: {},
  });
  const storage = createStorage({ driver });

  testDriver({ driver, skip: ["getKeys"] });

  it("can set, get, has and clear keys", async () => {
    await storage.setItem("first", "foo");
    await storage.setItem("second", "bar");
    expect(await storage.getItem("first")).toBe("foo");
    expect(await storage.getItem("second")).toBe("bar");
    await storage.removeItem("first");
    expect(await storage.getItem("first")).toBeNull();
    await storage.clear();
    expect(await storage.hasItem("second")).toBe(false);
  });
});
