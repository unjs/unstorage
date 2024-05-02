/// <reference types="@cloudflare/workers-types" />
import { describe, expect, test } from "vitest";
import { createStorage, snapshot } from "../../src";
import CloudflareKVBinding from "../../src/drivers/cloudflare-kv-binding";
import { testDriver } from "./utils";

const mockStorage = createStorage();

// https://developers.cloudflare.com/workers/runtime-apis/kv/
const mockBinding: KVNamespace = {
  get(key) {
    return mockStorage.getItem(key) as any;
  },
  getWithMetadata(key: string) {
    return mockStorage.getItem(key) as any;
  },
  put(key, value) {
    return mockStorage.setItem(key, value) as any;
  },
  delete(key) {
    return mockStorage.removeItem(key) as any;
  },
  list(opts) {
    return mockStorage
      .getKeys(opts?.prefix || undefined)
      .then((keys) => ({ keys: keys.map((name) => ({ name })) })) as any;
  },
};

describe("drivers: cloudflare-kv", () => {
  testDriver({
    driver: CloudflareKVBinding({ binding: mockBinding, base: "base" }),
    async additionalTests() {
      test("snapshot", async () => {
        expect(await snapshot(mockStorage, "")).toMatchInlineSnapshot(`
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
