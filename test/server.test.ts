import { readFile } from "node:fs/promises";
import { describe, it, expect } from "vitest";
import { listen } from "listhen";
import { $fetch } from "ofetch";
import { createStorage } from "../src";
import { createStorageServer } from "../src/server";
import fsDriver from "../src/drivers/fs.ts";
import httpDriver from "../src/drivers/http.ts";

describe("server", () => {
  it("basic", async () => {
    const storage = createTestStorage();
    const storageServer = createStorageServer(storage, {
      authorize(req) {
        if (req.type === "read" && req.key.startsWith("private:")) {
          throw new Error("Unauthorized Read");
        }
      },
    });
    const { close, url: serverURL } = await listen(storageServer.handle, {
      port: { random: true },
    });

    const fetchStorage = (url: string, options?: any) =>
      $fetch(url, { baseURL: serverURL, ...options });

    const remoteStorage = createStorage({
      driver: httpDriver({ base: serverURL }),
    });

    expect(await fetchStorage("foo/", {})).toMatchObject([]);

    await storage.setItem("foo/bar", "bar");
    await storage.setMeta("foo/bar", { mtime: new Date() });
    expect(await fetchStorage("foo/bar")).toBe("bar");

    expect(
      await fetchStorage("foo/bar", { method: "PUT", body: "updated" })
    ).toBe("OK");
    expect(await fetchStorage("foo/bar")).toBe("updated");
    expect(await fetchStorage("/")).toMatchObject(["foo/bar"]);

    expect(await fetchStorage("foo/bar", { method: "DELETE" })).toBe("OK");
    expect(await fetchStorage("foo/bar/", {})).toMatchObject([]);

    await expect(
      fetchStorage("/non", { method: "GET" }).catch((error) => {
        throw error.data;
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: "KV value not found",
    });

    await expect(
      fetchStorage("private/foo/bar", { method: "GET" }).catch((error) => {
        throw error.data;
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: "Unauthorized Read",
    });

    // TTL
    await storage.setItem("ttl", "ttl", { ttl: 1000 });
    expect(await storage.getMeta("ttl")).toMatchObject({ ttl: 1000 });
    expect(await remoteStorage.getMeta("ttl")).toMatchObject({ ttl: 1000 });

    await close();
  });

  it("properly encodes raw items", async () => {
    const storage = createStorage({
      driver: fsDriver({ base: "./test/fs-storage" }),
    });
    const storageServer = createStorageServer(storage);
    const { close, url: serverURL } = await listen(storageServer.handle, {
      port: { random: true },
    });

    const fetchStorage = (url: string, options?: any) =>
      $fetch(url, { baseURL: serverURL, ...options });

    const file = await readFile("./test/test.png");

    await storage.setItemRaw("1.png", file);
    await fetchStorage("2.png", {
      method: "PUT",
      body: file,
      headers: {
        "content-type": "application/octet-stream",
      },
    });
    const storedFileNode = await readFile("./test/fs-storage/1.png");
    const storedFileFetch = await readFile("./test/fs-storage/2.png");

    expect(storedFileNode).toStrictEqual(file);
    expect(storedFileFetch).toStrictEqual(file);
    expect(storedFileFetch).toStrictEqual(storedFileNode);

    await close();
  });
});

function createTestStorage() {
  const data = new Map<string, string>();
  const ttl = new Map<string, number>();
  const storage = createStorage({
    driver: {
      hasItem(key) {
        return data.has(key);
      },
      getItem(key) {
        return data.get(key) ?? null;
      },
      getItemRaw(key) {
        return data.get(key) ?? null;
      },
      setItem(key, value, opts) {
        data.set(key, value);
        if (opts?.ttl) {
          ttl.set(key, opts.ttl);
        }
      },
      setItemRaw(key, value, opts) {
        data.set(key, value);
        if (opts?.ttl) {
          ttl.set(key, opts.ttl);
        }
      },
      getMeta(key) {
        return {
          ttl: ttl.get(key),
        };
      },
      removeItem(key) {
        data.delete(key);
      },
      getKeys() {
        return [...data.keys()];
      },
      clear() {
        data.clear();
      },
      dispose() {
        data.clear();
      },
    },
  });

  return storage;
}
