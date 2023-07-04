/// <reference types="@cloudflare/workers-types" />
import { describe } from "vitest";
import { createStorage } from "../../src";
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
    driver: CloudflareR2Binding({ binding: mockBinding }),
  });
});
