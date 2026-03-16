---
icon: ic:baseline-http
---

# HTTP

> Use a remote HTTP/HTTPS endpoint as data storage.

## Usage

**Driver name:** `http`

::note
Supports built-in [http server](/guide/http-server) methods.
::

This driver implements meta for each key including `mtime` (last modified time) and `status` from HTTP headers by making a `HEAD` request.

```js
import { createStorage } from "unstorage";
import httpDriver from "unstorage/drivers/http";

const storage = createStorage({
  driver: httpDriver({ base: "http://cdn.com" }),
});
```

**Options:**

- `base`: Base URL for urls (**required**)
- `headers`: Custom headers to send on all requests

**Supported HTTP Methods:**

- `getItem`: Maps to http `GET`. Returns deserialized value if response is ok
- `hasItem`: Maps to http `HEAD`. Returns `true` if response is ok (200)
- `getMeta`: Maps to http `HEAD` (headers: `last-modified` => `mtime`, `x-ttl` => `ttl`)
- `setItem`: Maps to http `PUT`. Sends serialized value using body (`ttl` option will be sent as `x-ttl` header).
- `removeItem`: Maps to `DELETE`
- `clear`: Not supported

**Transaction Options:**

- `headers`: Custom headers to be sent on each operation (`getItem`, `setItem`, etc)
- `ttl`: Custom `ttl` (in seconds) for supported drivers. Will be mapped to `x-ttl` http header.
