export * from "./storage";
export * from "./types";
export * from "./utils";
export { defineDriver } from "./drivers/utils";

export const builtinDrivers = {
  azureAppConfiguration: "unstorage/drivers/azure-app-configuration",
  azureCosmos: "unstorage/drivers/azure-cosmos",
  azureKeyVault: "unstorage/drivers/azure-key-vault",
  azureStorageBlob: "unstorage/drivers/azure-storage-blob",
  azureStorageTable: "unstorage/drivers/azure-storage-table",
  cloudflareKVBinding: "unstorage/drivers/cloudflare-kv-binding",
  cloudflareKVHTTP: "unstorage/drivers/cloudflare-kv-http",
  cloudflareR2Binding: "unstorage/drivers/cloudflare-r2-binding",
  fs: "unstorage/drivers/fs",
  fsLite: "unstorage/drivers/fs-lite",
  github: "unstorage/drivers/github",
  http: "unstorage/drivers/http",
  indexedb: "unstorage/drivers/indexedb",
  localStorage: "unstorage/drivers/localstorage",
  lruCache: "unstorage/drivers/lru-cache",
  memory: "unstorage/drivers/memory",
  mongodb: "unstorage/drivers/mongodb",
  overlay: "unstorage/drivers/overlay",
  planetscale: "unstorage/drivers/planetscale",
  redis: "unstorage/drivers/redis",
  sessionStorage: "unstorage/drivers/session-storage",
  vercelKV: "unstorage/drivers/vercel-kv",

  /** @deprecated */
  "cloudflare-kv-binding": "unstorage/drivers/cloudflare-kv-binding",
  /** @deprecated */
  "cloudflare-kv-http": "unstorage/drivers/cloudflare-kv-http",
} as const;

type ExtractOpts<T> = T extends (opts: infer Opts) => any ? Opts : never;

export type BuiltinDriverOptions = {
  azureAppConfiguration: ExtractOpts<
    (typeof import("./drivers/azure-app-configuration"))["default"]
  >;
  azureCosmos: ExtractOpts<
    (typeof import("./drivers/azure-cosmos"))["default"]
  >;
  azureKeyVault: ExtractOpts<
    (typeof import("./drivers/azure-key-vault"))["default"]
  >;
  azureStorageBlob: ExtractOpts<
    (typeof import("./drivers/azure-storage-blob"))["default"]
  >;
  azureStorageTable: ExtractOpts<
    (typeof import("./drivers/azure-storage-table"))["default"]
  >;
  cloudflareKVBinding: ExtractOpts<
    (typeof import("./drivers/cloudflare-kv-binding"))["default"]
  >;
  cloudflareKVHTTP: ExtractOpts<
    (typeof import("./drivers/cloudflare-kv-http"))["default"]
  >;
  cloudflareR2Binding: ExtractOpts<
    (typeof import("./drivers/cloudflare-r2-binding"))["default"]
  >;
  fs: ExtractOpts<(typeof import("./drivers/fs"))["default"]>;
  fsLite: ExtractOpts<(typeof import("./drivers/fs-lite"))["default"]>;
  github: ExtractOpts<(typeof import("./drivers/github"))["default"]>;
  http: ExtractOpts<(typeof import("./drivers/http"))["default"]>;
  indexedb: ExtractOpts<(typeof import("./drivers/indexedb"))["default"]>;
  localStorage: ExtractOpts<
    (typeof import("./drivers/localstorage"))["default"]
  >;
  lruCache: ExtractOpts<(typeof import("./drivers/lru-cache"))["default"]>;
  memory: ExtractOpts<(typeof import("./drivers/memory"))["default"]>;
  mongodb: ExtractOpts<(typeof import("./drivers/mongodb"))["default"]>;
  overlay: ExtractOpts<(typeof import("./drivers/overlay"))["default"]>;
  planetscale: ExtractOpts<(typeof import("./drivers/planetscale"))["default"]>;
  redis: ExtractOpts<(typeof import("./drivers/redis"))["default"]>;
  sessionStorage: ExtractOpts<
    (typeof import("./drivers/session-storage"))["default"]
  >;
  vercelKV: ExtractOpts<(typeof import("./drivers/vercel-kv"))["default"]>;

  /** @deprecated */
  "cloudflare-kv-binding": ExtractOpts<
    (typeof import("./drivers/cloudflare-kv-binding"))["default"]
  >;
  /** @deprecated */
  "cloudflare-kv-http": ExtractOpts<
    (typeof import("./drivers/cloudflare-kv-http"))["default"]
  >;
};

export type BuiltinDriverName = keyof typeof builtinDrivers;
