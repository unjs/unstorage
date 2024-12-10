/// <reference types="@cloudflare/workers-types" />
import { describe, expect, test, afterAll } from "vitest";
import { createStorage, snapshot } from "../../src";
import CloudflareKVBinding from "../../src/drivers/cloudflare-kv-binding";
import { testDriver } from "./utils";
import { getPlatformProxy } from "wrangler";

describe("drivers: cloudflare-kv", async () => {
  const cfProxy = await getPlatformProxy();
  globalThis.__env__ = cfProxy.env;
  afterAll(async () => {
    globalThis.__env__ = undefined;
    await cfProxy.dispose();
  });
  testDriver({
    driver: CloudflareKVBinding({ base: "base" }),
    async additionalTests() {
      test("snapshot", async () => {
        const storage = createStorage({
          driver: CloudflareKVBinding({}),
        });
        expect(await snapshot(storage, "")).toMatchInlineSnapshot(`
          {
            "base:data:raw.bin": "base64:AQID",
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
