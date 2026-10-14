import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { testDriver } from "./utils.ts";
import vercelBlobDriver from "../../src/drivers/vercel-blob.ts";

const token = process.env.VITE_VERCEL_BLOB_READ_WRITE_TOKEN;

describe.skipIf(!token)("drivers: vercel-blob (public)", async () => {
  process.env.VERCEL_TEST_READ_WRITE_TOKEN = token;
  testDriver({
    driver: () =>
      vercelBlobDriver({
        access: "public",
        base: Math.round(Math.random() * 1_000_000).toString(16),
        envPrefix: "VERCEL_TEST",
      }),
    supportsCAS: true,
  });
});

const privateToken = process.env.VITE_VERCEL_PRIVATE_BLOB_READ_WRITE_TOKEN;

describe.skipIf(!privateToken)("drivers: vercel-blob (private)", async () => {
  process.env.VERCEL_TEST_PRIVATE_READ_WRITE_TOKEN = privateToken;
  testDriver({
    driver: () =>
      vercelBlobDriver({
        access: "private",
        base: Math.round(Math.random() * 1_000_000).toString(16),
        envPrefix: "VERCEL_TEST_PRIVATE",
      }),
    supportsCAS: true,
  });
});

describe("drivers: vercel-blob (list prefix)", async () => {
  const requests: { method: string; url: string; body: string }[] = [];
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    requests.push({ method: req.method!, url: req.url!, body });
    res.setHeader("content-type", "application/json");
    const blob = (pathname: string) => ({
      url: `https://store.public.blob.vercel-storage.com/${pathname}`,
      downloadUrl: `https://store.public.blob.vercel-storage.com/${pathname}?download=1`,
      pathname,
      size: 1,
      uploadedAt: new Date(0).toISOString(),
      etag: "",
    });
    res.end(
      JSON.stringify(req.method === "GET" ? { blobs: [blob("app/sub/a")], hasMore: false } : {}),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));

  const originalApiURL = process.env.VERCEL_BLOB_API_URL;
  beforeAll(() => {
    process.env.VERCEL_BLOB_API_URL = `http://localhost:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    if (originalApiURL === undefined) {
      delete process.env.VERCEL_BLOB_API_URL;
    } else {
      process.env.VERCEL_BLOB_API_URL = originalApiURL;
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const driver = vercelBlobDriver({
    access: "public",
    base: "app",
    token: "vercel_blob_rw_store_secret",
  });

  const listPrefixes = () =>
    requests
      .filter((r) => r.method === "GET")
      .map((r) => new URL(r.url, "http://localhost").searchParams.get("prefix"));

  it("lists keys under base with a trailing separator", async () => {
    requests.length = 0;
    expect(await driver.getKeys("", {})).toEqual(["sub/a"]);
    await driver.getKeys("sub:", {});
    expect(listPrefixes()).toEqual(["app/", "app/sub/"]);
  });

  it("clears only keys under the given base", async () => {
    requests.length = 0;
    await driver.clear!("sub:", {});
    expect(listPrefixes()).toEqual(["app/sub/"]);
  });
});
