---
icon: simple-icons:deno
---

# Deno KV

> Store data in Deno KV

::note{to="https://deno.com/kv"}
Learn more about Deno KV.
::

## Usage

::important
`deno-kv` driver requires [Deno deploy](https://docs.deno.com/deploy/kv/manual/on_deploy/) or [Deno runtime](https://docs.deno.com/runtime/) with `--unstable-kv` CLI flag.
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
- `getKV`: (advanced) Custom method that returns a Deno KV instance.
