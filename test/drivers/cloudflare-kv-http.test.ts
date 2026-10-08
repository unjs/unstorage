import { afterAll, describe, expect, it } from "vitest";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import cfKvHttpDriver from "../../src/drivers/cloudflare-kv-http";
import { createStorage } from "../../src";
import { testDriver } from "./utils";

const accountId = process.env.VITE_CLOUDFLARE_ACC_ID;
const namespaceId = process.env.VITE_CLOUDFLARE_KV_NS_ID;
const apiToken = process.env.VITE_CLOUDFLARE_TOKEN;

describe.skipIf(!accountId || !namespaceId || !apiToken)(
  "drivers: cloudflare-kv-http",
  () => {
    testDriver({
      driver: () =>
        cfKvHttpDriver({
          accountId: accountId!,
          namespaceId: namespaceId!,
          apiToken: apiToken!,
          base: Math.round(Math.random() * 1_000_000).toString(16),
        }),
    });
  }
);

describe("drivers: cloudflare-kv-http (key encoding)", async () => {
  const requests: { method: string; url: string }[] = [];
  const server = createServer((req, res) => {
    requests.push({ method: req.method!, url: req.url! });
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ success: true }));
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  const nsPath = "/client/v4/accounts/acc/storage/kv/namespaces/ns";
  const storage = createStorage({
    driver: cfKvHttpDriver({
      accountId: "acc",
      namespaceId: "ns",
      apiToken: "token",
      apiURL: `http://localhost:${(server.address() as AddressInfo).port}`,
    }),
  });

  it("keeps benign keys under /values/", async () => {
    requests.length = 0;
    await storage.removeItem("user-42-session");
    await storage.removeItem("a:b");
    expect(requests).toEqual([
      { method: "DELETE", url: `${nsPath}/values/user-42-session` },
      { method: "DELETE", url: `${nsPath}/values/a%3Ab` },
    ]);
  });

  const dotKeys = [".", "..", "/../", "\\..\\", "//..//", ":..:", "../", "/.."];
  for (const key of dotKeys) {
    it(`rejects dot-segment key ${JSON.stringify(key)}`, async () => {
      requests.length = 0;
      await expect(storage.removeItem(key)).rejects.toThrow("Invalid key");
      await expect(storage.getItem(key)).rejects.toThrow("Invalid key");
      await expect(storage.setItem(key, "x")).rejects.toThrow("Invalid key");
      await expect(storage.hasItem(key)).rejects.toThrow("Invalid key");
      expect(requests).toEqual([]);
    });
  }

  it("rejects keys with malformed unicode", async () => {
    requests.length = 0;
    await expect(storage.setItem("emoji:\uD83D", "x")).rejects.toThrow(
      "Invalid key"
    );
    await expect(storage.hasItem("emoji:\uD83D")).rejects.toThrow(
      "Invalid key"
    );
    expect(requests).toEqual([]);
  });

  const escapingKeys = ["..?x=1", "%2e%2e", ".%2e", "a#b", "a?b"];
  for (const key of escapingKeys) {
    it(`does not escape /values/ with key ${JSON.stringify(key)}`, async () => {
      requests.length = 0;
      await storage.removeItem(key).catch(() => {});
      for (const req of requests) {
        expect(req.url.startsWith(`${nsPath}/values/`)).toBe(true);
        expect(req.url.length).toBeGreaterThan(`${nsPath}/values/`.length);
      }
    });
  }

  it("rejects empty keys when base is set", async () => {
    requests.length = 0;
    const storage = createStorage({
      driver: cfKvHttpDriver({
        accountId: "acc",
        namespaceId: "ns",
        apiToken: "token",
        apiURL: `http://localhost:${(server.address() as AddressInfo).port}`,
        base: "app",
      }),
    });
    await storage.removeItem("a");
    for (const key of ["", ":", "/"]) {
      await expect(storage.removeItem(key)).rejects.toThrow("Invalid key");
    }
    expect(requests).toEqual([
      { method: "DELETE", url: `${nsPath}/values/app%3Aa` },
    ]);
  });

  it("does not let raw driver keys escape /values/", async () => {
    requests.length = 0;
    const driver = cfKvHttpDriver({
      accountId: "acc",
      namespaceId: "ns",
      apiToken: "token",
      apiURL: `http://localhost:${(server.address() as AddressInfo).port}`,
    });
    await driver.removeItem!("a/../../keys", {});
    expect(requests).toEqual([
      { method: "DELETE", url: `${nsPath}/values/a%2F..%2F..%2Fkeys` },
    ]);
  });
});
