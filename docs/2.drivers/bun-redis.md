---
icon: simple-icons:bun
---

# Bun Redis

> Store data in Redis using Bun's native RedisClient.

## Usage

**Driver name:** `bun-redis`

::read-more{to="https://bun.sh/docs/runtime/redis"}
Learn more about Bun's Redis client.
::

::note
This driver uses Bun's native [`RedisClient`](https://bun.sh/docs/runtime/redis) for high-performance Redis operations with automatic reconnection, connection pooling, and auto-pipelining.
::

::warning
This driver requires the [Bun runtime](https://bun.sh). It will not work in Node.js or other JavaScript runtimes.
::

Usage with Redis URL:

```js
import { createStorage } from "unstorage";
import bunRedisDriver from "unstorage/drivers/bun-redis";

const storage = createStorage({
  driver: bunRedisDriver({
    base: "unstorage",
    url: "redis://localhost:6379",
  }),
});
```

Usage with connection options:

```js
const storage = createStorage({
  driver: bunRedisDriver({
    base: "unstorage",
    url: "redis://localhost:6379",
    connectionTimeout: 10000,
    autoReconnect: true,
    maxRetries: 10,
    enableAutoPipelining: true,
  }),
});
```

Usage without URL (uses environment variables `REDIS_URL` or `VALKEY_URL`):

```js
const storage = createStorage({
  driver: bunRedisDriver({
    base: "unstorage",
  }),
});
```

**Options:**

- `base`: Optional prefix to use for all keys. Can be used for namespacing.
- `url`: Url to use for connecting to redis. Takes precedence over other connection options. Has the format `redis://<REDIS_USER>:<REDIS_PASSWORD>@<REDIS_HOST>:<REDIS_PORT>`
- `ttl`: Default TTL for all items in **seconds**.
- `scanCount`: How many keys to scan at once ([redis documentation](https://redis.io/docs/latest/commands/scan/#the-count-option)).
- `preConnect`: Whether to initialize the redis instance immediately. Otherwise, it will be initialized on the first read/write call. Default: `false`.

See [Bun RedisClient options](https://bun.sh/docs/runtime/redis) for all available connection options.

**Transaction options:**

- `ttl`: Supported for `setItem(key, value, { ttl: number /* seconds */ })`
