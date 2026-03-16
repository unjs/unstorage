// Auto-generated using scripts/gen-drivers.
// Do not manually edit!

import type { AzureAppConfigurationOptions } from "./drivers/azure-app-configuration.ts";
import type { AzureCosmosOptions } from "./drivers/azure-cosmos.ts";
import type { AzureKeyVaultOptions } from "./drivers/azure-key-vault.ts";
import type { AzureStorageBlobOptions } from "./drivers/azure-storage-blob.ts";
import type { AzureStorageTableOptions } from "./drivers/azure-storage-table.ts";
import type { CapacitorPreferencesOptions } from "./drivers/capacitor-preferences.ts";
import type { CacheOptions as CloudflareCacheBindingOptions } from "./drivers/cloudflare-cache-binding.ts";
import type { KVOptions as CloudflareKVBindingOptions } from "./drivers/cloudflare-kv-binding.ts";
import type { KVHTTPOptions as CloudflareKVHttpOptions } from "./drivers/cloudflare-kv-http.ts";
import type { CloudflareR2Options as CloudflareR2BindingOptions } from "./drivers/cloudflare-r2-binding.ts";
import type { DB0DriverOptions as Db0Options } from "./drivers/db0.ts";
import type { DenoKvNodeOptions as DenoKVNodeOptions } from "./drivers/deno-kv-node.ts";
import type { DenoKvOptions as DenoKVOptions } from "./drivers/deno-kv.ts";
import type { EncryptedStorageOptions as EncryptionOptions } from "./drivers/encryption.ts";
import type { FSStorageOptions as FsLiteOptions } from "./drivers/fs-lite.ts";
import type { FSStorageOptions as FsOptions } from "./drivers/fs.ts";
import type { GithubOptions } from "./drivers/github.ts";
import type { HTTPOptions as HttpOptions } from "./drivers/http.ts";
import type { IDBKeyvalOptions as IndexedbOptions } from "./drivers/indexedb.ts";
import type { LocalStorageOptions as LocalstorageOptions } from "./drivers/localstorage.ts";
import type { LRUDriverOptions as LruCacheOptions } from "./drivers/lru-cache.ts";
import type { MongoDbOptions as MongodbOptions } from "./drivers/mongodb.ts";
import type { NetlifyStoreOptions as NetlifyBlobsOptions } from "./drivers/netlify-blobs.ts";
import type { OverlayStorageOptions as OverlayOptions } from "./drivers/overlay.ts";
import type { PlanetscaleDriverOptions as PlanetscaleOptions } from "./drivers/planetscale.ts";
import type { RedisOptions } from "./drivers/redis.ts";
import type { S3DriverOptions as S3Options } from "./drivers/s3.ts";
import type { SessionStorageOptions } from "./drivers/session-storage.ts";
import type { UploadThingOptions as UploadthingOptions } from "./drivers/uploadthing.ts";
import type { UpstashOptions } from "./drivers/upstash.ts";
import type { VercelBlobOptions } from "./drivers/vercel-blob.ts";
import type { VercelCacheOptions as VercelRuntimeCacheOptions } from "./drivers/vercel-runtime-cache.ts";

export type BuiltinDriverName = "azure-app-configuration" | "azureAppConfiguration" | "azure-cosmos" | "azureCosmos" | "azure-key-vault" | "azureKeyVault" | "azure-storage-blob" | "azureStorageBlob" | "azure-storage-table" | "azureStorageTable" | "capacitor-preferences" | "capacitorPreferences" | "cloudflare-cache-binding" | "cloudflareCacheBinding" | "cloudflare-kv-binding" | "cloudflareKVBinding" | "cloudflare-kv-http" | "cloudflareKVHttp" | "cloudflare-r2-binding" | "cloudflareR2Binding" | "db0" | "deno-kv-node" | "denoKVNode" | "deno-kv" | "denoKV" | "encryption" | "fs-lite" | "fsLite" | "fs" | "github" | "http" | "indexedb" | "localstorage" | "lru-cache" | "lruCache" | "memory" | "mongodb" | "netlify-blobs" | "netlifyBlobs" | "null" | "overlay" | "planetscale" | "redis" | "s3" | "session-storage" | "sessionStorage" | "uploadthing" | "upstash" | "vercel-blob" | "vercelBlob" | "vercel-runtime-cache" | "vercelRuntimeCache";

export type BuiltinDriverOptions = {
  "azure-app-configuration": AzureAppConfigurationOptions;
  "azureAppConfiguration": AzureAppConfigurationOptions;
  "azure-cosmos": AzureCosmosOptions;
  "azureCosmos": AzureCosmosOptions;
  "azure-key-vault": AzureKeyVaultOptions;
  "azureKeyVault": AzureKeyVaultOptions;
  "azure-storage-blob": AzureStorageBlobOptions;
  "azureStorageBlob": AzureStorageBlobOptions;
  "azure-storage-table": AzureStorageTableOptions;
  "azureStorageTable": AzureStorageTableOptions;
  "capacitor-preferences": CapacitorPreferencesOptions;
  "capacitorPreferences": CapacitorPreferencesOptions;
  "cloudflare-cache-binding": CloudflareCacheBindingOptions;
  "cloudflareCacheBinding": CloudflareCacheBindingOptions;
  "cloudflare-kv-binding": CloudflareKVBindingOptions;
  "cloudflareKVBinding": CloudflareKVBindingOptions;
  "cloudflare-kv-http": CloudflareKVHttpOptions;
  "cloudflareKVHttp": CloudflareKVHttpOptions;
  "cloudflare-r2-binding": CloudflareR2BindingOptions;
  "cloudflareR2Binding": CloudflareR2BindingOptions;
  "db0": Db0Options;
  "deno-kv-node": DenoKVNodeOptions;
  "denoKVNode": DenoKVNodeOptions;
  "deno-kv": DenoKVOptions;
  "denoKV": DenoKVOptions;
  "encryption": EncryptionOptions;
  "fs-lite": FsLiteOptions;
  "fsLite": FsLiteOptions;
  "fs": FsOptions;
  "github": GithubOptions;
  "http": HttpOptions;
  "indexedb": IndexedbOptions;
  "localstorage": LocalstorageOptions;
  "lru-cache": LruCacheOptions;
  "lruCache": LruCacheOptions;
  "mongodb": MongodbOptions;
  "netlify-blobs": NetlifyBlobsOptions;
  "netlifyBlobs": NetlifyBlobsOptions;
  "overlay": OverlayOptions;
  "planetscale": PlanetscaleOptions;
  "redis": RedisOptions;
  "s3": S3Options;
  "session-storage": SessionStorageOptions;
  "sessionStorage": SessionStorageOptions;
  "uploadthing": UploadthingOptions;
  "upstash": UpstashOptions;
  "vercel-blob": VercelBlobOptions;
  "vercelBlob": VercelBlobOptions;
  "vercel-runtime-cache": VercelRuntimeCacheOptions;
  "vercelRuntimeCache": VercelRuntimeCacheOptions;
};

export const builtinDrivers = {
  "azure-app-configuration": "unstorage/drivers/azure-app-configuration",
  "azureAppConfiguration": "unstorage/drivers/azure-app-configuration",
  "azure-cosmos": "unstorage/drivers/azure-cosmos",
  "azureCosmos": "unstorage/drivers/azure-cosmos",
  "azure-key-vault": "unstorage/drivers/azure-key-vault",
  "azureKeyVault": "unstorage/drivers/azure-key-vault",
  "azure-storage-blob": "unstorage/drivers/azure-storage-blob",
  "azureStorageBlob": "unstorage/drivers/azure-storage-blob",
  "azure-storage-table": "unstorage/drivers/azure-storage-table",
  "azureStorageTable": "unstorage/drivers/azure-storage-table",
  "capacitor-preferences": "unstorage/drivers/capacitor-preferences",
  "capacitorPreferences": "unstorage/drivers/capacitor-preferences",
  "cloudflare-cache-binding": "unstorage/drivers/cloudflare-cache-binding",
  "cloudflareCacheBinding": "unstorage/drivers/cloudflare-cache-binding",
  "cloudflare-kv-binding": "unstorage/drivers/cloudflare-kv-binding",
  "cloudflareKVBinding": "unstorage/drivers/cloudflare-kv-binding",
  "cloudflare-kv-http": "unstorage/drivers/cloudflare-kv-http",
  "cloudflareKVHttp": "unstorage/drivers/cloudflare-kv-http",
  "cloudflare-r2-binding": "unstorage/drivers/cloudflare-r2-binding",
  "cloudflareR2Binding": "unstorage/drivers/cloudflare-r2-binding",
  "db0": "unstorage/drivers/db0",
  "deno-kv-node": "unstorage/drivers/deno-kv-node",
  "denoKVNode": "unstorage/drivers/deno-kv-node",
  "deno-kv": "unstorage/drivers/deno-kv",
  "denoKV": "unstorage/drivers/deno-kv",
  "encryption": "unstorage/drivers/encryption",
  "fs-lite": "unstorage/drivers/fs-lite",
  "fsLite": "unstorage/drivers/fs-lite",
  "fs": "unstorage/drivers/fs",
  "github": "unstorage/drivers/github",
  "http": "unstorage/drivers/http",
  "indexedb": "unstorage/drivers/indexedb",
  "localstorage": "unstorage/drivers/localstorage",
  "lru-cache": "unstorage/drivers/lru-cache",
  "lruCache": "unstorage/drivers/lru-cache",
  "memory": "unstorage/drivers/memory",
  "mongodb": "unstorage/drivers/mongodb",
  "netlify-blobs": "unstorage/drivers/netlify-blobs",
  "netlifyBlobs": "unstorage/drivers/netlify-blobs",
  "null": "unstorage/drivers/null",
  "overlay": "unstorage/drivers/overlay",
  "planetscale": "unstorage/drivers/planetscale",
  "redis": "unstorage/drivers/redis",
  "s3": "unstorage/drivers/s3",
  "session-storage": "unstorage/drivers/session-storage",
  "sessionStorage": "unstorage/drivers/session-storage",
  "uploadthing": "unstorage/drivers/uploadthing",
  "upstash": "unstorage/drivers/upstash",
  "vercel-blob": "unstorage/drivers/vercel-blob",
  "vercelBlob": "unstorage/drivers/vercel-blob",
  "vercel-runtime-cache": "unstorage/drivers/vercel-runtime-cache",
  "vercelRuntimeCache": "unstorage/drivers/vercel-runtime-cache",
} as const;
