---
icon: devicon-plain:cloudflareworkers
---

# Cloudflare

> Use Cloudflare Cache, KV, or R2 from Workers, or access KV through the HTTP API.

## Cache API (binding)

> Cache data inside Cloudflare Workers with the runtime Cache API.

**Driver import:** `unstorage/drivers/cloudflare-cache-binding`

```ts
import { createStorage } from "unstorage";
import cloudflareCacheDriver from "unstorage/drivers/cloudflare-cache-binding";

const storage = createStorage({
  driver: cloudflareCacheDriver({
    base: "my-app",
    ttl: 3600,
  }),
});
```

Options:

- `base`: Prefixes all cache keys.
- `ttl`: Default TTL in seconds.
- `name`: Uses a named cache from `caches.open(name)` instead of `caches.default`. Workers for Platforms namespaced scripts require a named cache.

Pass `ttl` or `tag` per write to set `Cache-Control` or `Cache-Tag`:

```ts
await storage.setItem("page:home", "<html>...</html>", {
  ttl: 60,
  tag: "pages",
});
```

::note
The Cache API cannot list keys. `getKeys()` returns an empty array, so clearing by base is not supported.
::

## Cloudflare KV (binding)

> Store data in Cloudflare KV and access from worker bindings.

### Usage

**Driver name:** `cloudflare-kv-binding`

::read-more{to="https://developers.cloudflare.com/workers/runtime-apis/kv"}
Learn more about Cloudflare KV.
::

This driver only works in a Cloudflare Workers environment. Use `cloudflare-kv-http` in other runtimes.

You need to create and assign a KV. See [KV Bindings](https://developers.cloudflare.com/workers/runtime-apis/kv#kv-bindings) for more information.

```ts
import { createStorage } from "unstorage";
import cloudflareKVBindingDriver from "unstorage/drivers/cloudflare-kv-binding";

export default {
  async fetch(_request: Request, env: Env) {
    const storage = createStorage({
      driver: cloudflareKVBindingDriver({ binding: env.STORAGE }),
    });

    return Response.json(await storage.getKeys());
  },
};
```

**Options:**

- `binding`: KV namespace binding or a global binding name. Defaults to `STORAGE`.
- `base`: Prefixes all stored keys.
- `minTTL`: Minimum TTL in seconds. Defaults to Cloudflare's minimum of `60`.

## Cloudflare KV (http)

> Store data in Cloudflare KV using the Cloudflare API v4.

### Usage

**Driver name:** `cloudflare-kv-http`

::read-more{to="https://developers.cloudflare.com/api/operations/workers-kv-namespace-list-namespaces"}
Learn more about Cloudflare KV API.
::

You need to create a KV namespace. See [KV Bindings](https://developers.cloudflare.com/workers/runtime-apis/kv#kv-bindings) for more information.

This driver uses native `fetch` and works across runtimes. Inside Cloudflare Workers, prefer `cloudflare-kv-binding` for direct binding access.

```ts
import { createStorage } from "unstorage";
import cloudflareKVHTTPDriver from "unstorage/drivers/cloudflare-kv-http";

const storage = createStorage({
  driver: cloudflareKVHTTPDriver({
    accountId: "my-account-id",
    namespaceId: "my-kv-namespace-id",
    apiToken: process.env.CLOUDFLARE_API_TOKEN!,
  }),
});
```

**Options:**

- `accountId`: Cloudflare account ID.
- `namespaceId`: The ID of the KV namespace to target. **Note:** be sure to use the namespace's ID, and not the name or binding used in a worker environment.
- `apiToken`: API Token generated from the [User Profile 'API Tokens' page](https://dash.cloudflare.com/profile/api-tokens).
- `email`: Email address associated with your account. May be used along with `apiKey` to authenticate in place of `apiToken`.
- `apiKey`: API key generated on the "My Account" page of the Cloudflare console. May be used along with `email` to authenticate in place of `apiToken`.
- `userServiceKey`: A special Cloudflare API key good for a restricted set of endpoints. Always begins with "v1.0-", may vary in length. May be used to authenticate in place of `apiToken` or `apiKey` and `email`.
- `apiURL`: Custom API URL. Defaults to `https://api.cloudflare.com`.
- `base`: Prefixes all stored keys.
- `minTTL`: Minimum TTL in seconds. Defaults to Cloudflare's minimum of `60`.

**Transaction options:**

- `ttl`: Supported for `setItem(key, value, { ttl: number /* seconds min 60 */ })`

**Supported methods:**

- `getItem`: `GET /values/:key`
- `hasItem`: `GET /metadata/:key`
- `setItem`: `PUT /values/:key`
- `removeItem`: `DELETE /values/:key`
- `getKeys`: `GET /keys`
- `clear`: Lists keys, then sends chunks of up to 10,000 keys with `POST /bulk/delete`.

## Cloudflare R2 (binding)

> Store data in Cloudflare R2 buckets and access from worker bindings.

::warning
This experimental driver requires a Cloudflare Workers R2 binding. For other runtimes, use the [S3 driver](/drivers/s3) with an R2 S3-compatible endpoint.
::

### Usage

**Driver name:** `cloudflare-r2-binding`

::read-more{to="https://developers.cloudflare.com/r2/api/workers/workers-api-reference/"}
Learn more about Cloudflare R2 buckets.
::

You need to create and assign a R2 bucket. See [R2 Bindings](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/#create-a-binding) for more information.

```ts
import { createStorage } from "unstorage";
import cloudflareR2BindingDriver from "unstorage/drivers/cloudflare-r2-binding";

export default {
  async fetch(_request: Request, env: Env) {
    const storage = createStorage({
      driver: cloudflareR2BindingDriver({ binding: env.BUCKET }),
    });

    return Response.json(await storage.getKeys());
  },
};
```

**Options:**

- `binding`: Bucket binding or name. Default is `BUCKET`.
- `base`: Prefix all keys with base.

**Transaction options:**

- `getItemRaw(key, { type: "..." })`
  - `type: "object"`: Return the [R2 object body](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/#r2objectbody-definition).
  - `type: "stream"`: Return body stream.
  - `type: "blob"`: Return a `Blob`.
  - `type: "bytes"`: Return a `Uint8Array`.
  - `type: "arrayBuffer"`: Return an `ArrayBuffer` (default)

## Cloudflare R2 (http)

To use Cloudflare R2 over HTTP, configure the [S3 driver](/drivers/s3) with your R2 endpoint and set `region` to `auto`.
