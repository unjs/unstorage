---
icon: ic:baseline-http
---

# HTTP

> Use a remote HTTP endpoint through the unstorage API.

**Driver import:** `unstorage/drivers/http`

The driver is designed for the built-in [storage server protocol](/guide/http-server), but it can connect to any endpoint that implements the same methods and response formats.

```ts
import { createStorage } from "unstorage";
import httpDriver from "unstorage/drivers/http";

const storage = createStorage({
  driver: httpDriver({
    base: "https://storage.example.com",
    headers: {
      authorization: `Bearer ${process.env.STORAGE_TOKEN}`,
    },
  }),
});
```

## Options

- `base` (**required**): Base URL of the storage endpoint.
- `headers`: Headers sent with every request.

## Per-operation options

- `headers`: Additional headers for one operation. These override driver-level headers.
- `ttl`: TTL in seconds. The driver sends it as `x-ttl`.

```ts
await storage.setItem(
  "sessions:1",
  { userId: 1 },
  {
    ttl: 3600,
    headers: { "x-request-id": "abc" },
  },
);
```

## Protocol mapping

| Storage method           | HTTP request                                             |
| ------------------------ | -------------------------------------------------------- |
| `hasItem(key)`           | `HEAD /key`                                              |
| `getItem(key)`           | `GET /key`                                               |
| `getItemRaw(key)`        | `GET /key` with `Accept: application/octet-stream`       |
| `getMeta(key)`           | `HEAD /key`                                              |
| `setItem(key, value)`    | `PUT /key`                                               |
| `setItemRaw(key, value)` | `PUT /key` with `Content-Type: application/octet-stream` |
| `removeItem(key)`        | `DELETE /key`                                            |
| `getKeys(base)`          | `GET /base/:`                                            |
| `clear(base)`            | `DELETE /base/:`                                         |

`getItem` returns the response body as text, which the storage layer then deserializes. `getItemRaw` returns an `ArrayBuffer`.

`getMeta` maps the `last-modified` header to `mtime`, the `x-ttl` header to `ttl`, and includes the HTTP response `status`.

A `404` response becomes `null` for `getItem` and `getItemRaw`, or `false` for `hasItem`. Other non-success responses throw an error.
