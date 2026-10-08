import { describe, afterAll, expect, it } from "vitest";
import driver from "../../src/drivers/http";
import { createStorage } from "../../src";
import { createStorageServer } from "../../src/server";
import { listen } from "listhen";
import { testDriver } from "./utils";

describe("drivers: http", async () => {
  const remoteStorage = createStorage();
  const server = createStorageServer(remoteStorage, {
    authorize(req) {
      if (req.event.node.req.headers["x-global-header"] !== "1") {
        // console.log(req.key, req.type, req.event.node.req.headers);
        throw new Error("Missing global test header!");
      }
      if (
        req.key === "authorized" &&
        req.event.node.req.headers["x-auth-header"] !== "1"
      ) {
        // console.log(req.key, req.type, req.event.node.req.headers);
        throw new Error("Missing auth test header!");
      }
    },
  });
  const listener = await listen(server.handle, {
    port: { random: true },
  });

  afterAll(async () => {
    await listener.close();
  });

  testDriver({
    driver: driver({
      base: listener!.url,
      headers: { "x-global-header": "1" },
    }),
    async additionalTests(ctx) {
      it("custom headers", async () => {
        await ctx.storage.setItem("authorized", "test", {
          headers: { "x-auth-header": "1" },
        });
      });
      it("null item", async () => {
        await ctx.storage.setItem("nullItem", null);
        await ctx.storage.setItem("nullStringItem", "null");
        expect(await ctx.storage.getItem("nullItem")).toBeNull();
        expect(await ctx.storage.getItem("nanItem")).toBeNull();
        expect(await ctx.storage.getItem("nullStringItem")).toBeNull();
      });
    },
  });

  it("rejects keys escaping base URL", async () => {
    const httpDriver = driver({ base: "https://trusted.example/api/storage" });
    const storage = createStorage({ driver: httpDriver });
    for (const key of ["", "../secret", "foo/../../secret", "foo:..", "."]) {
      await expect(storage.setItem(key, "x"), key).rejects.toThrow(
        "Invalid key"
      );
      await expect(storage.getItem(key), key).rejects.toThrow("Invalid key");
      await expect(storage.hasItem(key), key).rejects.toThrow("Invalid key");
      await expect(storage.removeItem(key), key).rejects.toThrow("Invalid key");
    }
    // Raw driver methods reject (instead of throwing synchronously)
    await expect(httpDriver.hasItem("..", {})).rejects.toThrow("Invalid key");
    await expect(httpDriver.getKeys("..", {})).rejects.toThrow("Invalid key");
    await expect(httpDriver.clear!("foo:..:..", {})).rejects.toThrow(
      "Invalid key"
    );
  });

  it("keeps special characters in keys literal", async () => {
    const storage = createStorage({
      driver: driver({
        base: listener!.url,
        headers: { "x-global-header": "1" },
      }),
    });
    await remoteStorage.setItem("a", "a");
    await remoteStorage.setItem("special:other", "other");

    const keys = [
      "#",
      " ",
      "a#b",
      "a b",
      "a+b",
      "a%b",
      "a%20b",
      "a%2Fb",
      "%2e%2e",
      ".%2e",
      ".\t.",
      "..\n",
      ".. ",
    ];
    for (const key of keys) {
      const fullKey = `special:${key}`;
      await storage.setItem(fullKey, `value of ${JSON.stringify(key)}`);
      expect(await remoteStorage.getItem(fullKey), key).toBe(
        `value of ${JSON.stringify(key)}`
      );
      expect(await storage.getItem(fullKey), key).toBe(
        `value of ${JSON.stringify(key)}`
      );
      expect(await storage.hasItem(fullKey), key).toBe(true);
    }
    expect((await remoteStorage.getKeys("special")).sort()).toEqual(
      [...keys.map((key) => `special:${key}`), "special:other"].sort()
    );

    // `#` does not truncate the key
    expect(await storage.getItem("a#b")).toBeNull();
    expect(await storage.hasItem("a#missing")).toBe(false);

    // Item operations never turn into base (clear) operations
    for (const key of ["#", " ", "?x", "special:..#"]) {
      await storage.removeItem(key).catch(() => {});
    }
    for (const key of keys) {
      await storage.removeItem(`special:${key}`);
    }
    expect(await remoteStorage.getItem("a")).toBe("a");
    expect(await remoteStorage.getKeys("special")).toEqual(["special:other"]);
  });
});
