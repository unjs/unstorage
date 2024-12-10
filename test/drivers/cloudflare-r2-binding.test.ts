/// <reference types="@cloudflare/workers-types" />
import { describe, test, expect, afterAll } from "vitest";
import { createStorage, snapshot } from "../../src";
import CloudflareR2Binding from "../../src/drivers/cloudflare-r2-binding";
import { testDriver } from "./utils";
import { getPlatformProxy } from "wrangler";

describe("drivers: cloudflare-r2-binding", async () => {
  const cfProxy = await getPlatformProxy();
  globalThis.__env__ = cfProxy.env;
  afterAll(async () => {
    globalThis.__env__ = undefined;
    await cfProxy.dispose();
  });

  testDriver({
    driver: CloudflareR2Binding({ base: "base" }),
    async additionalTests() {
      test("snapshot", async () => {
        const storage = createStorage({
          driver: CloudflareR2Binding({}),
        });

        const storageSnapshot = await snapshot(storage, "");

        storageSnapshot["base:data:raw.bin"] = (await storage.getItemRaw(
          "base:data:raw.bin",
          { type: "bytes" }
        )) as any;

        expect(storageSnapshot).toMatchInlineSnapshot(`
          {
            "base:data:raw.bin": Uint8Array [
              1,
              2,
              3,
            ],
            "base:data:serialized1.json": "SERIALIZED",
            "base:data:serialized2.json": {
              "serializedObj": "works",
            },
            "base:data:test.json": {
              "json": "works",
            },
            "base:data:true.json": true,
            "base:my-false-flag": false,
            "base:s1:a": "test_data",
            "base:s2:a": "test_data",
            "base:s3:a": "test_data",
            "base:t:1": "test_data_t1",
            "base:t:2": "test_data_t2",
            "base:t:3": "test_data_t3",
            "base:v1:a": "test_data_v1:a",
            "base:v2:a": "test_data_v2:a",
            "base:v3:a": "test_data_v3:a?q=1",
            "base:zero": 0,
          }
        `);
      });
    },
  });
});
