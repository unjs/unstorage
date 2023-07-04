/// <reference types="@cloudflare/workers-types" />
import { describe, test, expect } from "vitest";
import { createStorage, snapshot } from "../../src";
import CloudflareR2Binding from "../../src/drivers/cloudflare-r2-binding";
import { testDriver } from "./utils";

const mockStorage = createStorage();

// https://developers.cloudflare.com/workers/runtime-apis/kv/
const mockBinding: R2Bucket = {
  async head(key) {
    return (await mockStorage.hasItem(key)) ? ({ key } as any) : null;
  },
  async get(key) {
    return {
      text: () => mockStorage.getItem(key),
      arrayBuffer: () => mockStorage.getItemRaw(key),
    } as any;
  },
  put(key, value) {
    return mockStorage.setItemRaw(key, value) as any;
  },
  delete(key) {
    if (Array.isArray(key)) {
      return Promise.all(key.map((k) => mockStorage.removeItem(k))) as any;
    }
    return mockStorage.removeItem(key as string) as any;
  },
  list(opts) {
    return mockStorage
      .getKeys(opts?.prefix || undefined)
      .then((keys) => ({ objects: keys.map((key) => ({ key })) })) as any;
  },
  createMultipartUpload() {
    throw new Error("Not implemented");
  },
  resumeMultipartUpload() {
    throw new Error("Not implemented");
  },
};

describe("drivers: cloudflare-r2-binding", () => {
  testDriver({
    driver: CloudflareR2Binding({ binding: mockBinding, base: "base" }),
    async additionalTests(ctx) {
      test("snapshot", async () => {
        expect(await snapshot(mockStorage, "")).toMatchInlineSnapshot(`
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
            "base:s1:a": "test_data",
            "base:s2:a": "test_data",
            "base:s3:a": "test_data",
            "base:t:1": "test_data_t1",
            "base:t:2": "test_data_t2",
            "base:t:3": "test_data_t3",
            "base:v1:a": "test_data_v1:a",
            "base:v2:a": "test_data_v2:a",
            "base:v3:a": "test_data_v3:a?q=1",
          }
        `);
      });
    },
  });
});
