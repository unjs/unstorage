import { afterAll, beforeAll, describe, expect, it } from "vitest";
import driver from "../../src/drivers/netlify-blobs.ts";
import { testDriver } from "./utils.ts";
import { BlobsServer } from "@netlify/blobs/server";
import { resolve } from "node:path";
import { rm, mkdir } from "node:fs/promises";
import { createStorage } from "../../src/index.ts";

describe("drivers: netlify-blobs", async () => {
  const dataDir = resolve(__dirname, "tmp/netlify-blobs");
  await rm(dataDir, { recursive: true, force: true }).catch(() => {});
  await mkdir(dataDir, { recursive: true });

  let server: BlobsServer;
  const token = "mock";
  const siteID = "1";
  beforeAll(async () => {
    server = new BlobsServer({
      directory: dataDir,
      debug: !true,
      token,
      port: 8971,
    });
    await server.start();
  });

  testDriver({
    driver: driver({
      name: "test",
      edgeURL: `http://localhost:8971`,
      token,
      siteID,
    }),
  });

  testDriver({
    driver: driver({
      deployScoped: true,
      edgeURL: `http://localhost:8971`,
      token,
      siteID,
      deployID: "test",
      // Usually defaulted via the environment; only required in a test environment like this
      region: "us-east-1",
    }),
  });

  afterAll(async () => {
    await server.stop();
  });
});

describe("drivers: netlify-blobs (key validation)", () => {
  const requests: { method: string; url: string }[] = [];
  const fetch = async (url: any, init?: RequestInit) => {
    requests.push({ method: init?.method || "get", url: String(url) });
    return new Response(null, { status: 404 });
  };
  const blobsDriver = driver({
    name: "test",
    siteID: "1",
    token: "mock",
    apiURL: "http://localhost",
    fetch,
  });
  const storage = createStorage({ driver: blobsDriver });

  it("keeps benign keys under the store", async () => {
    requests.length = 0;
    await storage.removeItem("a:b");
    expect(requests).toEqual([
      { method: "delete", url: "http://localhost/api/v1/blobs/1/site:test/a:b" },
    ]);
  });

  // `""` and `#` would target the store itself (same request as `deleteAll()`)
  it.each(["", ":", "#"])("rejects store-level key %j", async (key) => {
    requests.length = 0;
    await expect(storage.removeItem(key)).rejects.toThrow("Invalid key");
    await expect(storage.getItem(key)).rejects.toThrow("Invalid key");
    await expect(storage.hasItem(key)).rejects.toThrow("Invalid key");
    expect(requests).toEqual([]);
  });

  it.each([
    "..",
    ".",
    "%2e%2e",
    ".%2E",
    ".\t.",
    "\n..",
    "a#b",
    "a?b",
    "a/../b",
    String.raw`a\..\b`,
    "a%2f..%2fb",
    "a%5C..",
    // URL parsers strip leading/trailing C0 controls and spaces
    ".. ",
    " ",
    "\t",
    "a/.. ",
    "..\u0000",
    "\u0000",
    ". ",
    " ..",
  ])("rejects escaping key %j", async (key) => {
    requests.length = 0;
    await expect(blobsDriver.removeItem!(key, {})).rejects.toThrow("Invalid key");
    await expect(blobsDriver.getItem(key, {})).rejects.toThrow("Invalid key");
    await expect(blobsDriver.getMeta!(key, {})).rejects.toThrow("Invalid key");
    await expect(blobsDriver.setItem!(key, "x", {})).rejects.toThrow("Invalid key");
    expect(requests).toEqual([]);
  });

  // Storage does not trim whitespace, so these reach the driver as-is
  it.each([".. ", " ", "\t", "..\u0000", "\u0000", "x "])(
    "rejects whitespace key %j through storage",
    async (key) => {
      requests.length = 0;
      await expect(storage.removeItem(key)).rejects.toThrow("Invalid key");
      await expect(storage.setItem(key, "x")).rejects.toThrow("Invalid key");
      expect(requests).toEqual([]);
    },
  );

  it("keeps keys with inner spaces", async () => {
    requests.length = 0;
    await storage.removeItem("a b");
    await storage.removeItem("a:.. :b");
    expect(requests).toEqual([
      { method: "delete", url: "http://localhost/api/v1/blobs/1/site:test/a%20b" },
      { method: "delete", url: "http://localhost/api/v1/blobs/1/site:test/a:..%20:b" },
    ]);
  });
});
