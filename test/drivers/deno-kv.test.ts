import { describe, expect, test } from "vitest";
import { createStorage } from "../../src";
import kv from "../../src/drivers/deno-kv";

const storage = createStorage({
  driver: kv({
    prefix: "unstorage",
  }),
});

test("deno-kv", async () => {
  // Test setItem and getItem
  await storage.setItem("testKey", "testValue");
  const value = await storage.getItem("testKey");
  expect(value).toBe("testValue");

  // Test hasItem
  const hasItem = await storage.hasItem("testKey");
  expect(hasItem).toBe(true);

  // Test removeItem
  await storage.removeItem("testKey");
  const removedValue = await storage.getItem("testKey");
  expect(removedValue).toBe(null);

  // Test getKeys
  await storage.setItem("testKey1", "testValue1");
  await storage.setItem("testKey2", "testValue2");
  const keys = await storage.getKeys();
  expect(keys).toEqual(expect.arrayContaining(["testKey1", "testKey2"]));

  // Test clear
  await storage.clear();
  const newKeys = await storage.getKeys();
  expect(newKeys).toHaveLength(0);
});
