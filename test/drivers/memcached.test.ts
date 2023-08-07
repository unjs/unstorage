import { describe, it, expect } from "vitest";
import memcachedDriver from "../../src/drivers/memcached";
import { createStorage } from "../../src";
import { testDriver } from "./utils";

const MEMCACHED_LOCATION = process.env.MEMCACHED_LOCATION;

describe.skipIf(!MEMCACHED_LOCATION)("Memcached storage", () => {
  const driver = memcachedDriver({
    location: MEMCACHED_LOCATION,
  });

  const storage = createStorage({ driver });

  testDriver({ driver, canListKeys: false });

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
