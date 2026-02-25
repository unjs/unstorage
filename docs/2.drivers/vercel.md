---
icon: gg:vercel
---

# Vercel

## Vercel Runtime Cache

> Cache data within Vercel Functions using the Runtime Cache API.

::read-more{to="https://vercel.com/docs/functions"}
Learn more about Vercel Functions and Runtime Cache.
::

### Usage

**Driver name:** `vercel-runtime-cache`

```js
import { createStorage } from "unstorage";
import vercelRuntimeCacheDriver from "unstorage/drivers/vercel-runtime-cache";

const storage = createStorage({
  driver: vercelRuntimeCacheDriver({
    // base: "app",
    // ttl: 60, // seconds
    // tags: ["v1"],
  }),
});
```

**Optional step:** To allow using outside of vercel functions, install `@vercel/functions` in your project:

:pm-install{name="@vercel/functions"}

### Options

- `base`: Optional prefix to use for all keys (namespacing).
- `ttl`: Default TTL for all items in seconds.
- `tags`: Default tags to apply to all cache entries (Note: Will be merged with per-call option tags).

### Per-call options

- `ttl`: Add TTL (in seconds) for this `setItem` call.
- `tags`: Apply tags to this `setItem` call.

**Example:**

```js
await storage.setItem("user:123", JSON.stringify({ name: "Ana" }), {
  ttl: 3600,
  tags: ["user:123"],
});
```

**To expire by tags:**

```js
await storage.clear("", { tags: ["user:123"] });
```

### Limitations

- `getKeys`: The runtime cache API does not support listing keys; this returns `[]`.
- `clear`: The runtime cache API does not support clearing by base; only tag-based expiration is supported.
- Metadata: Runtime cache does not expose metadata; `getMeta` is not implemented.
- Persistence: This is not a persistent store; it’s intended for request-time caching inside Vercel Functions.

> [!NOTE]
> The Unstorage driver does not hash keys by default. To replicate the same behavior in `@vercel/functions` when using `getCache`, set the `keyHashFunction: (key) => key` option.

## Vercel Blob

> Store data in a Vercel Blob Store.

::read-more{to="https://vercel.com/docs/storage/vercel-blob"}
Learn more about Vercel Blob.
::

### Usage

**Driver name:** `vercel-blob`

To use, you will need to install [`@vercel/blob`](https://www.npmjs.com/package/@vercel/blob) dependency in your project:

:pm-install{name="@vercel/blob"}

#### Public access

Public blobs are accessible via their URL without authentication.

```js
import { createStorage } from "unstorage";
import vercelBlobDriver from "unstorage/drivers/vercel-blob";

const storage = createStorage({
  driver: vercelBlobDriver({
    access: "public",
    // token: "<your secret token>", // or set BLOB_READ_WRITE_TOKEN
    // base: "unstorage",
    // envPrefix: "BLOB",
  }),
});
```

#### Private access

Private blobs require authentication to access. You need to create a private blob store on the Vercel dashboard before using this mode.

```js
import { createStorage } from "unstorage";
import vercelBlobDriver from "unstorage/drivers/vercel-blob";

const storage = createStorage({
  driver: vercelBlobDriver({
    access: "private",
    // token: "<your secret token>", // or set BLOB_READ_WRITE_TOKEN
    // base: "unstorage",
    // envPrefix: "BLOB",
  }),
});
```

### Options

- `access`: Whether the blob should be publicly or privately accessible. Must be `"public"` or `"private"`.
- `base`: Prefix to prepend to all keys. Can be used for namespacing.
- `token`: Rest API token to use for connecting to your Vercel Blob store. If not provided, it will be read from the environment variable `BLOB_READ_WRITE_TOKEN`.
- `envPrefix`: Prefix to use for token environment variable name. Default is `BLOB` (env name = `BLOB_READ_WRITE_TOKEN`).
