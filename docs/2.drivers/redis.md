---
icon: simple-icons:redis
---

# Redis

> Store data in a Redis.

## Usage

**Driver name:** `redis`

::read-more{to="https://redis.com"}
Learn more about Redis.
::

::note
Unstorage uses [`ioredis`](https://github.com/redis/ioredis) internally to connect to Redis.
::

To use it, you will need to install `ioredis` in your project:

:pm-install{name="ioredis"}

Usage with single Redis instance:

```js
import { createStorage } from "unstorage";
import redisDriver from "unstorage/drivers/redis";

const storage = createStorage({
  driver: redisDriver({
    raw: true,
    base: "unstorage",
    host: 'HOSTNAME',
    tls: true as any,
    port: 6380,
    password: 'REDIS_PASSWORD'
  }),
});
```

Usage with a Redis cluster (e.g. AWS ElastiCache or Azure Redis Cache):

⚠️ If you connect to a cluster, when running commands that operate over multiple keys, all keys must be part of the same hashslot. Otherwise you may encounter the Redis error `CROSSSLOT Keys in request don't hash to the same slot`. You should use [`hashtags`](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/#hash-tags) to control how keys are slotted. If you want all keys to hash to the same slot, you can include the hashtag in the base prefix by wrapping it in curly braces. Read more about [Clustering Best Practices](https://redis.io/blog/redis-clustering-best-practices-with-keys/).

```js
const storage = createStorage({
  driver: redisDriver({
    raw: true,
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

- `base`: Optional prefix to use for all keys. Can be used for namespacing. Has to be used as a hashtag prefix for redis cluster mode.
- `url`: Url to use for connecting to redis. Takes precedence over `host` option. Has the format `redis://<REDIS_USER>:<REDIS_PASSWORD>@<REDIS_HOST>:<REDIS_PORT>`
- `cluster`: List of redis nodes to use for cluster mode. Takes precedence over `url` and `host` options.
- `clusterOptions`: Options to use for cluster mode.
- `ttl`: Default TTL for all items in **seconds**.
- `scanCount`: How many keys to scan at once ([redis documentation](https://redis.io/docs/latest/commands/scan/#the-count-option)).
- `preConnect`: Whether to initialize the redis instance immediately. Otherwise, it will be initialized on the first read/write call. Default: `false`.

See [ioredis](https://github.com/redis/ioredis/blob/master/API.md#new-redisport-host-options) for all available options.

**Transaction options:**

- `ttl`: Supported for `setItem(key, value, { ttl: number /* seconds */ })`
