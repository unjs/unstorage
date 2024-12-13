---
icon: simple-icons:deno
---

# Deno KV

> Store data in Deno KV

::note{to="https://deno.com/kv"}
Learn more about Deno KV.
::

## Usage (Deno)

::important
`deno-kv` driver requires [Deno deploy](https://docs.deno.com/deploy/kv/manual/on_deploy/) or [Deno runtime](https://docs.deno.com/runtime/) with `--unstable-kv` CLI flag. See [Node.js](#usage-nodejs) section for other runtimes.
::

::note
The driver automatically maps Unstorage keys to Deno. For example, `"test:key"` key will be mapped to `["test", "key"]` and vice versa.
::

```js
import { createStorage } from "unstorage";
import denoKVdriver from "unstorage/drivers/deno-kv";

const storage = createStorage({
  driver: denoKVdriver({
    // path: ":memory:",
    // base: "",
  }),
});
```

**Options:**

- `path`: (optional) File system path to where you'd like to store your database, otherwise one will be created for you based on the current working directory of your script by Deno. You can pass `:memory:` for testing.
- `base`: (optional) Prefix key added to all operations.
- `openKV`: (advanced) Custom method that returns a Deno KV instance.

## Usage (Node.js)

Deno provides [`@deno/kv`](https://www.npmjs.com/package/@deno/kv) npm package, A Deno KV client library optimized for Node.js.

- Access [Deno Deploy](https://deno.com/deploy) remote databases (or any
  endpoint implementing the open
  [KV Connect](https://github.com/denoland/denokv/blob/main/proto/kv-connect.md)
  protocol) on Node 18+.
- Create local KV databases backed by
  [SQLite](https://www.sqlite.org/index.html), using optimized native
  [NAPI](https://nodejs.org/docs/latest-v18.x/api/n-api.html) packages for
  Node - compatible with databases created by Deno itself.
- Create ephemeral in-memory KV instances backed by SQLite memory files or by a
  lightweight JS-only implementation for testing.

Install `@deno/kv` peer dependency:

:pm-install{name="@deno/kv"}

```js
import { createStorage } from "unstorage";
import denoKVNodedriver from "unstorage/drivers/deno-kv-node";

const storage = createStorage({
  driver: denoKVNodedriver({
    // path: ":memory:",
    // base: "",
  }),
});
```
