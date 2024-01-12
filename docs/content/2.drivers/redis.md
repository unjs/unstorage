---
title: Redis
description: Store data in a Redis.
---

## Usage

::callout{to="https://redis.com" target="_blank" icon="i-ph-info-duotone" color="blue"}
Learn more about Redis.
::

::callout
Unstorage uses [`ioredis`](https://github.com/luin/ioredis) internally to connect to Redis.
::

Usage with single Redis instance:

```js
import { createStorage } from "unstorage";
import redisDriver from "unstorage/drivers/redis";

const storage = createStorage({
  driver: redisDriver({
    base: "unstorage",
    host: 'HOSTNAME',
    tls: true as any,
    port: 6380,
    password: 'REDIS_PASSWORD'
  }),
});
```

Usage with Redis cluster (e.g. AWS ElastiCache or Azure Redis Cache):

⚠️ If you connect to a cluster, you have to use `hastags` as prefix to avoid the redis error `CROSSSLOT Keys in request don't hash to the same slot`. This means, the prefix has to be surrounded by curly braces, which forces the keys into the same hash slot.

```js
const storage = createStorage({
  driver: redisDriver({
    base: "{unstorage}",
    cluster: [
      {
        port: 6380,
        host: "HOSTNAME",
      },
    ],
    clusterOptions: {
      redisOptions: {
        tls: { servername: "HOSTNAME" },
        password: "REDIS_PASSWORD",
      },
    },
  }),
});
```

**Options:**

- `base`: Optional prefix to use for all keys. Can be used for namespacing. Has to be used as hastag prefix for redis cluster mode.
- `url`: Url to use for connecting to redis. Takes precedence over `host` option. Has the format `redis://<REDIS_USER>:<REDIS_PASSWORD>@<REDIS_HOST>:<REDIS_PORT>`
- `cluster`: List of redis nodes to use for cluster mode. Takes precedence over `url` and `host` options.
- `clusterOptions`: Options to use for cluster mode.
- `ttl`: Default TTL for all items in **seconds**.

See [ioredis](https://github.com/luin/ioredis/blob/master/API.md#new-redisport-host-options) for all available options.

`lazyConnect` option is enabled by default so that connection happens on first redis operation.

**Transaction options:**

- `ttl`: Supported for `setItem(key, value, { ttl: number /* seconds */ })`
