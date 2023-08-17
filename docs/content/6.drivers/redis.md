# Redis

Store data in a [Redis](https://redis.com/) storage using [ioredis](https://github.com/luin/ioredis).

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

## Upstash Redis

[Upstash](https://upstash.com/) is a serverless Redis cloud service. The `redis-upstash` driver is a HTTP only driver that can be used in environment where TCP isn't available.

```ts
import { createStorage } from "unstorage";
import redisUpstashDriver from "unstorage/drivers/redis-upstash";

const storage = createStorage({
  driver: redisUpstashDriver({
    base: "unstorage",
    url: "https://your-upstash-db.com",
    token: "your-token",
  }),
});
```

**Options:**

- `url`: Url of your upstash redis database. This will default to the value of the `UPSTASH_REDIS_REST_URL` environment variable if not provided.
- `token`: Authorization token. This will default to the value of the `UPSTASH_REDIS_REST_TOKEN` environment variable if not provided.
- `base`: Optional prefix to use for all keys. Can be used for namespacing. Has to be used as hastag prefix for redis cluster mode.
- `envPrefix`: Optional prefix for your environment variables. Defaults to `UPSTASH_REDIS_REST`.
- `ttl`: Default TTL for all items in **seconds**.

See [upstash driver docs](https://github.com/upstash/upstash-redis) for all available options.

**Transaction options:**

- `ttl`: Supported for `setItem(key, value, { ttl: number /* seconds */ })`
