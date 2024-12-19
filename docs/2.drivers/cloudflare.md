---
icon: devicon-plain:cloudflareworkers
---

# Cloudflare

> Store data in Cloudflare KV or R2 storage.

## CloudFlare KV (binding)

> Store data in Cloudflare KV and access from worker bindings.

### Usage

**Driver name:** `cloudflare-kv-binding`

::read-more{to="https://developers.cloudflare.com/workers/runtime-apis/kv"}
Learn more about Cloudflare KV.
::

**Note:** This driver only works in a cloudflare worker environment, use `cloudflare-kv-http` for other environments.

You need to create and assign a KV. See [KV Bindings](https://developers.cloudflare.com/workers/runtime-apis/kv#kv-bindings) for more information.

```js
import { createStorage } from "unstorage";
import cloudflareKVBindingDriver from "unstorage/drivers/cloudflare-kv-binding";

// Using binding name to be picked from globalThis
const storage = createStorage({
  driver: cloudflareKVBindingDriver({ binding: "STORAGE" }),
});

// Directly setting binding
const storage = createStorage({
  driver: cloudflareKVBindingDriver({ binding: globalThis.STORAGE }),
});

// Using from Durable Objects and Workers using Modules Syntax
const storage = createStorage({
  driver: cloudflareKVBindingDriver({ binding: this.env.STORAGE }),
});

// Using outside of Cloudflare Workers (like Node.js)
// Use cloudflare-kv-http
```

**Options:**

- `binding`: KV binding or name of namespace. Default is `STORAGE`.
- `base`: Adds prefix to all stored keys

## Cloudflare KV (http)

> Store data in Cloudflare KV using the Cloudflare API v4.

### Usage

**Driver name:** `cloudflare-kv-http`

::read-more{to="https://developers.cloudflare.com/api/operations/workers-kv-namespace-list-namespaces"}
Learn more about Cloudflare KV API.
::

You need to create a KV namespace. See [KV Bindings](https://developers.cloudflare.com/workers/runtime-apis/kv#kv-bindings) for more information.

**Note:** This driver uses native fetch and works universally! For a direct usage in a cloudflare worker environment, please use `cloudflare-kv-binding` driver for best performance!

```js
import { createStorage } from "unstorage";
import cloudflareKVHTTPDriver from "unstorage/drivers/cloudflare-kv-http";

// Using `apiToken`
const storage = createStorage({
  driver: cloudflareKVHTTPDriver({
    accountId: "my-account-id",
    namespaceId: "my-kv-namespace-id",
    apiToken: "supersecret-api-token",
  }),
});

// Using `email` and `apiKey`
const storage = createStorage({
  driver: cloudflareKVHTTPDriver({
    accountId: "my-account-id",
    namespaceId: "my-kv-namespace-id",
    email: "me@example.com",
    apiKey: "my-api-key",
  }),
});

// Using `userServiceKey`
const storage = createStorage({
  driver: cloudflareKVHTTPDriver({
    accountId: "my-account-id",
    namespaceId: "my-kv-namespace-id",
    userServiceKey: "v1.0-my-service-key",
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
- `apiURL`: Custom API URL. Default is `https://api.cloudflare.com`.
- `base`: Adds prefix to all stored keys

**Transaction options:**

- `ttl`: Supported for `setItem(key, value, { ttl: number /* seconds min 60 */ })`

**Supported methods:**

- `getItem`: Maps to [Read key-value pair](https://api.cloudflare.com/#workers-kv-namespace-read-key-value-pair) `GET accounts/:account_identifier/storage/kv/namespaces/:namespace_identifier/values/:key_name`
- `hasItem`: Maps to [Read key-value pair](https://api.cloudflare.com/#workers-kv-namespace-read-key-value-pair) `GET accounts/:account_identifier/storage/kv/namespaces/:namespace_identifier/values/:key_name`. Returns `true` if `<parsed response body>.success` is `true`.
- `setItem`: Maps to [Write key-value pair](https://api.cloudflare.com/#workers-kv-namespace-write-key-value-pair) `PUT accounts/:account_identifier/storage/kv/namespaces/:namespace_identifier/values/:key_name`
- `removeItem`: Maps to [Delete key-value pair](https://api.cloudflare.com/#workers-kv-namespace-delete-key-value-pair) `DELETE accounts/:account_identifier/storage/kv/namespaces/:namespace_identifier/values/:key_name`
- `getKeys`: Maps to [List a Namespace's Keys](https://api.cloudflare.com/#workers-kv-namespace-list-a-namespace-s-keys) `GET accounts/:account_identifier/storage/kv/namespaces/:namespace_identifier/keys`
- `clear`: Maps to [Delete key-value pair](https://api.cloudflare.com/#workers-kv-namespace-delete-multiple-key-value-pairs) `DELETE accounts/:account_identifier/storage/kv/namespaces/:namespace_identifier/bulk`

## CloudFlare R2 (binding)

> Store data in Cloudflare R2 buckets and access from worker bindings.

::warning
This is an experimental driver! This driver only works in a cloudflare worker environment and cannot be used in other runtime environments such as Node.js (r2-http driver is coming soon)
::

### Usage

**Driver name:** `cloudflare-r2-binding`

::read-more{to="https://developers.cloudflare.com/r2/api/workers/workers-api-reference/"}
Learn more about Cloudflare R2 buckets.
::

You need to create and assign a R2 bucket. See [R2 Bindings](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/#create-a-binding) for more information.

```js
import { createStorage } from "unstorage";
import cloudflareR2BindingDriver from "unstorage/drivers/cloudflare-r2-binding";

// Using binding name to be picked from globalThis
const storage = createStorage({
  driver: cloudflareR2BindingDriver({ binding: "BUCKET" }),
});

// Directly setting binding
const storage = createStorage({
  driver: cloudflareR2BindingDriver({ binding: globalThis.BUCKET }),
});

// Using from Durable Objects and Workers using Modules Syntax
const storage = createStorage({
  driver: cloudflareR2BindingDriver({ binding: this.env.BUCKET }),
});
```

**Options:**

- `binding`: Bucket binding or name. Default is `BUCKET`.
- `base`: Prefix all keys with base.

**Transaction options:**

- `getItemRaw(key, { type: "..." })`
  - `type: "object"`: Return the [R2 object body](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/#r2objectbody-definition).
  - `type: "stream"`: Return body stream.
  - `type: "blob"`: Return a `Blob`.
  - `type: "bytes"`: Return an `Uint8Array`.
  - `type: "arrayBuffer"`: Return an `ArrayBuffer` (default)

## Cloudflare R2 (http)

To use Cloudflare R2 over HTTP, you can use [s3 driver](/drivers/s3).

> [!NOTE]
> Make sure to set `region` to `auto`
