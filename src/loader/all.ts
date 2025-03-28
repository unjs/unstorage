import { factoryLoader } from "./_utils";

const all = {
  "azure+appconfigarution": factoryLoader(
    () => import("../drivers/azure-app-configuration")
  ),
  "azure+cosmos": factoryLoader(() => import("../drivers/azure-cosmos")),
  "azure+keyvault": factoryLoader(() => import("../drivers/azure-key-vault")),
  "azure+blob": factoryLoader(() => import("../drivers/azure-storage-blob")),
  "azure+table": factoryLoader(() => import("../drivers/azure-storage-table")),
  "capacitor+preferences": factoryLoader(
    () => import("../drivers/capacitor-preferences")
  ),
  "cloudflarekv+binding": factoryLoader(
    () => import("../drivers/cloudflare-kv-binding")
  ),
  "cloudflarekv+http": factoryLoader(
    () => import("../drivers/cloudflare-kv-http")
  ),
  "cloudflarer2+binding": factoryLoader(
    () => import("../drivers/cloudflare-r2-binding")
  ),
  db: factoryLoader(() => import("../drivers/db0")),
  "denokv+node": factoryLoader(() => import("../drivers/deno-kv-node")),
  denokv: factoryLoader(() => import("../drivers/deno-kv")),
  file: factoryLoader(() => import("../drivers/fs")),
  github: factoryLoader(() => import("../drivers/github")),
  http: factoryLoader(() => import("../drivers/http")),
  https: factoryLoader(() => import("../drivers/http")),
  indexedb: factoryLoader(() => import("../drivers/indexedb")),
  localstorage: factoryLoader(() => import("../drivers/localstorage")),
  cache: factoryLoader(() => import("../drivers/lru-cache")),
  memory: factoryLoader(() => import("../drivers/memory")),
  mongodb: factoryLoader(() => import("../drivers/mongodb")),
  "netlify+blobs": factoryLoader(() => import("../drivers/netlify-blobs")),
  null: factoryLoader(() => import("../drivers/null")),
  overlay: factoryLoader(() => import("../drivers/overlay")),
  planetscale: factoryLoader(() => import("../drivers/planetscale")),
  redis: factoryLoader(() => import("../drivers/redis")),
  s3: factoryLoader(() => import("../drivers/s3")),
  sessionstorage: factoryLoader(() => import("../drivers/session-storage")),
  uploadthing: factoryLoader(() => import("../drivers/uploadthing")),
  upstash: factoryLoader(() => import("../drivers/upstash")),
  "vercel+blob": factoryLoader(() => import("../drivers/vercel-blob")),
  "vercel+kv": factoryLoader(() => import("../drivers/vercel-kv")),
};

export default all;
