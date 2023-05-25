export * from "./storage";
export * from "./types";
export * from "./utils";
export { defineDriver } from "./drivers/utils";

export const builtinDrivers = {
  awsDynamoDB: "unstorage/drivers/aws-dynamodb",
  azureStorageTable: "unstorage/drivers/azure-storage-table",
  azureCosmos: "unstorage/drivers/azure-cosmos",
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
  memory: "unstorage/drivers/memory",
  mongodb: "unstorage/drivers/mongodb",
  overlay: "unstorage/drivers/overlay",
  planetscale: "unstorage/drivers/planetscale",
  redis: "unstorage/drivers/redis",
  azureKeyVault: "unstorage/drivers/azure-key-vault",
  sessionStorage: "unstorage/drivers/session-storage",
  vercelKV: "unstorage/drivers/vercel-kv",
};

export type BuiltinDriverName = keyof typeof builtinDrivers;
