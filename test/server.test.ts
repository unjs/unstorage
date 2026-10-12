import { readFile } from "node:fs/promises";
import { request } from "node:http";
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

describe("server (invalid keys)", () => {
  it("rejects empty and dot-segment keys before authorize", async () => {
    const storage = createStorage();
    await storage.setItem("a", "x");
    const authorized: string[] = [];
    const storageServer = createStorageServer(storage, {
      authorize(req) {
        authorized.push(req.key);
      },
    });
    const { close, url: serverURL } = await listen(storageServer.handle, {
      port: { random: true },
    });
    try {
      for (const path of ["/..", "/a:..", "/a/%2e%2e", "/..:", "/..?x"]) {
        for (const method of ["GET", "HEAD", "PUT", "DELETE"]) {
          const status = await rawRequest(serverURL, path, method);
          expect(status, `${method} ${path}`).toBe(400);
        }
      }
      // The query is ignored, so these are the root base key
      for (const path of ["/", "/?x", "/:?x", "/%3A?x"]) {
        for (const method of ["HEAD", "PUT"]) {
          const status = await rawRequest(serverURL, path, method);
          expect(status, `${method} ${path}`).toBe(400);
        }
      }
      expect(authorized).toEqual([]);
      // Listing the root still works
      expect(await $fetch("/", { baseURL: serverURL })).toEqual(["a"]);
      expect(await $fetch("/?x", { baseURL: serverURL })).toEqual(["a"]);
    } finally {
      await close();
    }
  });

  it("authorizes the same key that is used", async () => {
    const storage = createStorage();
    await storage.setItem("users:alice", "admin");
    await storage.setItem("users:alice:secret", "s");
    await storage.setItem("users:alice:other", "o");
    const authorized: string[] = [];
    const storageServer = createStorageServer(storage, {
      authorize(req) {
        authorized.push(`${req.type} ${req.key}`);
        // Only allow access inside `users:alice:`
        if (!req.key.startsWith("users:alice:")) {
          throw new Error("Unauthorized");
        }
      },
    });
    const { close, url: serverURL } = await listen(storageServer.handle, {
      port: { random: true },
    });
    try {
      // HEAD / PUT on a base key would reach the item `users:alice`
      for (const path of [
        "/users/alice/",
        "/users/alice:",
        "/users/alice?x=/",
        "/users/alice?x=:",
      ]) {
        for (const method of ["HEAD", "PUT"]) {
          const status = await rawRequest(serverURL, path, method);
          expect(status, `${method} ${path}`).toBeGreaterThanOrEqual(400);
        }
      }
      expect(await storage.getItem("users:alice")).toBe("admin");

      // A trailing `/` in the query does not turn removeItem into clear
      authorized.length = 0;
      expect(
        await rawRequest(serverURL, "/users/alice/secret?/", "DELETE")
      ).toBe(200);
      expect(authorized).toEqual(["write users:alice:secret"]);
      expect(await storage.hasItem("users:alice:secret")).toBe(false);
      expect(await storage.getItem("users:alice:other")).toBe("o");
    } finally {
      await close();
    }
  });
});

// Unlike `fetch`, does not resolve `.` / `..` segments in the path
function rawRequest(baseURL: string, path: string, method: string) {
  const { hostname, port } = new URL(baseURL);
  return new Promise<number | undefined>((resolve, reject) => {
    const req = request({ hostname, port, path, method }, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on("error", reject);
    req.end(method === "PUT" ? "x" : undefined);
  });
}
