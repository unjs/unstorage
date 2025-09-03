---
icon: simple-icons:redis
---

# Node Redis

> Store data in Redis using `node-redis`.

## Usage

**Driver name:** `node-redis`

::read-more{to="https://redis.com"}
Learn more about Redis.
::

::note
The Node Redis driver uses [`node-redis`](https://github.com/redis/node-redis) internally to connect to Redis.
::

To use it, you will need to install `redis` in your project:

:pm-install{name="redis"}

Usage with single Redis instance:

```js
import { createStorage } from "unstorage";
import nodeRedisDriver from "unstorage/drivers/node-redis";

const storage = createStorage({
  driver: nodeRedisDriver({
    base: "unstorage",
    clientOptions: {
      username: "REDIS_USERNAME",
      socket: {
        host: "HOSTNAME",
        port: 6380,
        tls: true,
      },
    },
  }),
});
```

Usage with a Redis cluster (e.g. AWS ElastiCache or Azure Redis Cache):

⚠️ If you connect to a cluster, when running commands that operate over multiple keys, all keys must be part of the same hashslot. Otherwise you may encounter the Redis error `CROSSSLOT Keys in request don't hash to the same slot`. You should use [`hashtags`](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/#hash-tags) to control how keys are slotted. If you want all keys to hash to the same slot, you can include the hashtag in the base prefix by wrapping it in curly braces. Read more about [Clustering Best Practices](https://redis.io/blog/redis-clustering-best-practices-with-keys/).

```js
const storage = createStorage({
  driver: nodeRedisDriver({
    base: "{unstorage}",
    clusterOptions: {
      rootNodes: [
        {
          password: "REDIS_PASSWORD",
          socket: {
            host: "HOSTNAME",
            port: 6380,
            tls: true,
          },
        },
      ],
    },
  }),
});
```

**Options:**

- `base`: Optional prefix to use for all keys. Can be used for namespacing. Has to be used as a hashtag prefix for redis cluster mode.
- `clientOptions`: Connection options when using a single Redis instance. ([`node-redis` documentation](https://github.com/redis/node-redis/blob/master/docs/client-configuration.md#createclient-configuration))
- `clusterOptions`: Connection options to use for cluster mode. ([`node-redis` documentation](https://github.com/redis/node-redis/blob/master/docs/clustering.md#createcluster-configuration))
- `ttl`: Default TTL for all items in **seconds**.
- `scanCount`: How many keys to scan at once ([redis documentation](https://redis.io/docs/latest/commands/scan/#the-count-option)).
- `preConnect`: Whether to initialize the redis instance immediately. Otherwise, it will be initialized on the first read/write call. Default: `false`.

**Transaction options:**

- `ttl`: Supported for `setItem(key, value, { ttl: number /* seconds */ })`
