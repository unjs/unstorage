### `redis`

Store data in a redis storage using [ioredis](https://github.com/luin/ioredis).

```js
import { createStorage } from "unstorage";
import redisDriver from "unstorage/drivers/redis";

const storage = createStorage({
  driver: redisDriver({
    base: "storage:",
  }),
});
```

**Options:**

- `base`: Prefix all keys with base
- `url`: (optional) connection string

See [ioredis](https://github.com/luin/ioredis/blob/master/API.md#new-redisport-host-options) for all available options.

`lazyConnect` option is enabled by default so that connection happens on first redis operation.
