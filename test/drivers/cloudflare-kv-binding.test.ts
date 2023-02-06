/// <reference types="@cloudflare/workers-types" />
import { describe } from "vitest";
import { createStorage } from "../../src";
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
    driver: CloudflareKVBinding({ binding: mockBinding }),
  });
});
