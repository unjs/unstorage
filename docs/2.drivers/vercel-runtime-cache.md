---
icon: gg:vercel
---

# Vercel Runtime Cache

> Cache data within Vercel Functions using the Runtime Cache API.

::read-more{to="https://vercel.com/docs/functions"}
Learn more about Vercel Functions and Runtime Cache.
::

## Usage

**Driver name:** `vercel-runtime-cache`

To use, install `@vercel/functions` in your project:

:pm-install{name="@vercel/functions"}

```js
import { createStorage } from "unstorage";
import vercelRuntimeCacheDriver from "unstorage/drivers/vercel-runtime-cache";

const storage = createStorage({
  driver: vercelRuntimeCacheDriver({
    // base: "app",
    // namespace: "my-app",
    // namespaceSeparator: ":",
    // keyHashFunction: (key) => key, // optional
    // ttl: 60, // seconds
    // tags: ["v1"],
  }),
});
```

## Options

- `base`: Optional prefix to use for all keys (namespacing).
- `namespace`: Optional namespace passed to the underlying runtime cache.
- `namespaceSeparator`: Optional separator string for the namespace.
- `keyHashFunction`: Optional custom hash function for generating keys.
- `ttl`: Default TTL for all items in seconds.
- `tags`: Default tags to apply to all cache entries.

## Per-call options

- `ttl`: Add TTL (in seconds) for this `setItem` call.
- `tags`: Apply tags to this `setItem` call.

Example:

```js
await storage.setItem("user:123", JSON.stringify({ name: "Ana" }), {
  ttl: 3600,
  tags: ["user:123"],
});
```

To expire by tags:

```js
await storage.clear("", { tags: ["user:123"] });
```

## Limitations

- `getKeys`: The runtime cache API does not support listing keys; this returns `[]`.
- `clear`: The runtime cache API does not support clearing by base; only tag-based expiration is supported.
- Metadata: Runtime cache does not expose metadata; `getMeta` is not implemented.
- Persistence: This is not a persistent store; it’s intended for request-time caching inside Vercel Functions.

## Compatibility

- Requires `@vercel/functions` and a Vercel environment.
