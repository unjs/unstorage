---
icon: ic:baseline-http
---

# HTTP

> Use a remote HTTP/HTTPS endpoint as data storage.

## Usage

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
- `setItem`: Maps to http `PUT`. Sends serialized value using body
- `removeItem`: Maps to `DELETE`
- `clear`: Not supported

**Transaction Options:**

- `headers`: Custom headers to be sent on each operation (`getItem`, `setItem`, etc)
