# Deno KV

Store data in Deno KV on Node, Bun, Deno (local), and Deno Deploy.

## Usage

::note{to="https://docs.deno.com/deploy/kv/manual"}
Learn more about Deno KV.
::

This driver does not implement `watch` because Deno KV `watch` is not compatible with the unstorage `watch`

```js
import { createStorage } from "unstorage";
import denoKVdriver from "unstorage/drivers/deno-kv";

const storage = createStorage({
  driver: denoKVdriver({ prefix: "base" }),
});
```

**Options:**

- `path`: Deno KV path, this can be a [Deno KV Connect URL](https://docs.deno.com/deploy/kv/manual/node#kv-connect-urls), [self hosted Deno KV URL](https://github.com/denoland/denokv/releases), an sqlite file, or none for in memory
- `accessToken`: Access token, required when path is a URL. Will not work in Deno, you must set DENO_KV_ACCESS_TOKEN env variable.
- `prefix`: Prefix for all keys
