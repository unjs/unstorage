---
icon: bi:memory
---

# Memory Meta

> Keep data in memory with support for metadata.

As per the default `memory` driver it keeps data in memory using [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map).

## Usage

**Driver name:** `memory-meta`

This drive aims to be a more advanced version of the `memory` driver by adding metadata support, while introducing a small overhead and allocation cost.

By supporting metadata, it allows for features like Time-To-Live (TTL),active by default, and optionally tracking a rough size of the stored data. The TTL can be set per item or globally.

Each key has its own metadata, that includes:
- `ttl`: remaining Time-To-Live in milliseconds, if set during creation.
- `atime`: last access time.
- `mtime`: last modified time.
- `ctime`: last change time.
- `birthtime`: Creation time.
- `size`: Size in bytes, if enabled.

::note
For memory efficency all `*time` values are stored in milliseconds since the Unix epoch. But returned as `Date` when called via `getMeta`.
::

```js
import { createStorage } from "unstorage";
import memoryMetaDriver from "unstorage/drivers/memory-meta";

const storage = createStorage({
  driver: memoryMetaDriver({
    base: "my-storage",   // Optional prefix to use for all keys.
    ttl: 1000 * 60 * 60,  // default `undefined`
    ttlAutoPurge: true,   // default `true`
    trackSize: true,      // default `false`
  }),
});
```

**Options:**

- `base`: Optional prefix to use for all keys. Can be used for namespacing.
- `ttl`: Default Time-To-Live for all items in **milliseconds**.
- `ttlAutoPurge`: Whether to automatically purge expired items. (default: `true`)
- `trackSize`: Whether to track the size of items in bytes. (default: `false`)
