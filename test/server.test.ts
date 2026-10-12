import { readFile } from "node:fs/promises";
import { request } from "node:http";
import { describe, it, expect } from "vitest";
import { serve } from "srvx";
import { $fetch } from "ofetch";
import { createStorage } from "../src/index.ts";
import { createStorageHandler } from "../src/server.ts";
import fsDriver from "../src/drivers/fs.ts";
import httpDriver from "../src/drivers/http.ts";

describe("server", () => {
  it("basic", async () => {
    const storage = createTestStorage();
    const storageServer = createStorageHandler(storage, {
      authorize(req) {
        if (req.type === "read" && req.key.startsWith("private:")) {
          throw new Error("Unauthorized Read");
        }
      },
    });
    const server = await serve({
      port: 0,
      fetch: storageServer,
    });

    const fetchStorage = (url: string, options?: any) =>
      $fetch(url, { baseURL: server.url!, ...options });

    const remoteStorage = createStorage({
      driver: httpDriver({ base: server.url! }),
    });

    expect(await fetchStorage("foo/", {})).toMatchObject([]);

    await storage.setItem("foo/bar", "bar");
    await storage.setMeta("foo/bar", { mtime: new Date() });
    expect(await fetchStorage("foo/bar")).toBe("bar");

    expect(await fetchStorage("foo/bar", { method: "PUT", body: "updated" })).toBe("OK");
    expect(await fetchStorage("foo/bar")).toBe("updated");
    expect(await fetchStorage("/")).toMatchObject(["foo/bar"]);

    expect(await fetchStorage("foo/bar", { method: "DELETE" })).toBe("OK");
    expect(await fetchStorage("foo/bar/", {})).toMatchObject([]);

    await expect(
      fetchStorage("/non", { method: "GET" }).catch((error) => {
        throw error.data;
      }),
    ).rejects.toMatchObject({
      status: 404,
      message: "KV value not found",
    });

    await expect(
      fetchStorage("private/foo/bar", { method: "GET" }).catch((error) => {
        throw error.data;
      }),
    ).rejects.toMatchObject({
      status: 401,
      statusText: "Unauthorized Read",
      message: "Unauthorized Read",
    });

    // TTL
    await storage.setItem("ttl", "ttl", { ttl: 1000 });
    expect(await storage.getMeta("ttl")).toMatchObject({ ttl: 1000 });
    expect(await remoteStorage.getMeta("ttl")).toMatchObject({ ttl: 1000 });

    await server.close();
  });

  it("properly encodes raw items", async () => {
    const storage = createStorage({
      driver: fsDriver({ base: "./test/fs-storage" }),
    });
    const storageServer = createStorageHandler(storage);
    const server = await serve({
      port: 0,
      fetch: storageServer,
    });

    const fetchStorage = (url: string, options?: any) =>
      $fetch(url, { baseURL: server.url!, ...options });

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

    await server.close();
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

describe("server (keys)", () => {
  it("rejects empty and dot-segment keys before authorize", async () => {
    const storage = createStorage();
    await storage.setItem("a", "x");
    const authorized: string[] = [];
    const server = await serve({
      port: 0,
      fetch: createStorageHandler(storage, {
        authorize(req) {
          authorized.push(req.key);
        },
      }),
    });
    try {
      // URL parsing already resolves `/..` and `/%2e%2e`, these survive it
      for (const path of ["/a:..", "/..:", "/a/..%2Fb", "/%2E%2E%3A", "/..%5C?x", "/%E0%A4%A"]) {
        for (const method of ["GET", "HEAD", "PUT", "DELETE"]) {
          const status = await rawRequest(server.url!, path, method);
          expect(status, `${method} ${path}`).toBe(400);
        }
      }
      expect(authorized).toEqual([]);
      // Listing the root still works
      expect(await $fetch("/", { baseURL: server.url! })).toEqual(["a"]);
    } finally {
      await server.close();
    }
  });

  it("decodes percent-encoded keys", async () => {
    const storage = createStorage();
    const server = await serve({ port: 0, fetch: createStorageHandler(storage) });
    try {
      expect(await rawRequest(server.url!, "/a%20b/c%25d", "PUT")).toBe(200);
      expect(await storage.getItem("a b:c%d")).toBe("x");
    } finally {
      await server.close();
    }
  });
});

// Unlike `fetch`, does not resolve `.` / `..` segments in the path
function rawRequest(baseURL: string, path: string, method: string) {
  const { port } = new URL(baseURL);
  return new Promise<number | undefined>((resolve, reject) => {
    const req = request({ hostname: "localhost", port, path, method }, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on("error", reject);
    req.end(method === "PUT" ? "x" : undefined);
  });
}
