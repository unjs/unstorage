## Upstash Redis

The `redis-upstash` driver is an [Upstash](https://upstash.com/) based HTTP only driver that can be used in environments where TCP isn't available.

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
