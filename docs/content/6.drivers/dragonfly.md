# Dragonfly

Store data in a [Dragonfly](https://www.dragonflydb.io/) storage using [ioredis](https://github.com/luin/ioredis).

::alert{type="warning"}
Currently, Dragonfly uses the same API and driver as [redis](/drivers/redis).
::

```js
import { createStorage } from "unstorage";
import dragonflyDriver from "unstorage/drivers/dragonfly";

const storage = createStorage({
  driver: dragonflyDriver({
    base: "unstorage",
    host: 'HOSTNAME',
    tls: true as any,
    port: 6380,
    password: 'DRAGONFLY_PASSWORD'
  }),
});
```

::alert{type="info"}
For more advanced configurations, follow the same steps as the documentation for the [redis](/drivers/redis) driver.
::
