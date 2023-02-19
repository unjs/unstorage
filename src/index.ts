export * from "./storage";
export * from "./types";
export * from "./utils";
export { defineDriver } from "./drivers/utils";

export const builtinDrivers = {
  azureStorageBlob: "unstorage/drivers/azure-storage-blob",
  cloudflareKVHTTP: "unstorage/drivers/cloudflare-kv-http",
  cloudflareKVBinding: "unstorage/drivers/cloudflare-kv-binding",
  "cloudflare-kv-http": "unstorage/drivers/cloudflare-kv-http",
  "cloudflare-kv-binding": "unstorage/drivers/cloudflare-kv-binding",
  fs: "unstorage/drivers/fs",
  github: "unstorage/drivers/github",
  http: "unstorage/drivers/http",
  localStorage: "unstorage/drivers/localstorage",
  lruCache: "unstorage/drivers/lru-cache",
  localstorage: "unstorage/drivers/localstorage",
  memory: "unstorage/drivers/memory",
  overlay: "unstorage/drivers/overlay",
  planetscale: "unstorage/drivers/planetscale",
  redis: "unstorage/drivers/redis",
};

export type BuiltinDriverName = keyof typeof builtinDrivers;
