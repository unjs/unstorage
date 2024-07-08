---
icon: mingcute:dragonfly-line
---

# Dragonfly

> Store data in a drop-in Redis replacement - Dragonfly.

## Usage

::read-more{to="https://www.dragonflydb.io"}
Learn more about Dragonfly.
::

::note
Unstorage uses [`ioredis`](https://github.com/luin/ioredis) internally to connect to Dragonfly.
::

To use it, you will need to install `ioredis` in your project:

:pm-install{name="ioredis"}

Usage with single Dragonfly instance:

```js
import { createStorage } from "unstorage";
import dragonflyDriver from "unstorage/drivers/dragonfly";

const storage = createStorage({
  driver: dragonflyDriver({
    base: "unstorage",
    host: 'HOSTNAME',
    tls: true as any,
    port: 6379,
    password: 'DRAGONFLY_PASSWORD'
  }),
});
```

Usage with Dragonfly cluster:

⚠️ If you connect to a cluster, you have to use `hastags` as prefix to avoid the dragonfly error `CROSSSLOT Keys in request don't hash to the same slot`. This means, the prefix has to be surrounded by curly braces, which forces the keys into the same hash slot.

```js
const storage = createStorage({
  driver: dragonflyDriver({
    base: "{unstorage}",
    cluster: [
      {
        port: 6380,
        host: "HOSTNAME",
      },
    ],
    clusterOptions: {
      dragonflyOptions: {
        tls: { servername: "HOSTNAME" },
        password: "DRAGONFLY_PASSWORD",
      },
    },
  }),
});
```

**Options:**

::note
Dragonfly is wire-compatible with Redis.
::

- `base`: Optional prefix to use for all keys. Can be used for namespacing. Has to be used as hastag prefix for dragonfly cluster mode.
- `url`: Url to use for connecting to dragonfly. Takes precedence over `host` option. Has the format `redis://<DRAGONFLY_USER>:<DRAGONFLY_PASSWORD>@<DRAGONFLY_HOST>:<DRAGONFLY_PORT>`
- `cluster`: List of dragonfly nodes to use for cluster mode. Takes precedence over `url` and `host` options.
- `clusterOptions`: Options to use for cluster mode.
- `ttl`: Default TTL for all items in **seconds**.

See [ioredis](https://github.com/luin/ioredis/blob/master/API.md#new-redisport-host-options) for all available options.

`lazyConnect` option is enabled by default so that connection happens on first redis operation.

**Transaction options:**

- `ttl`: Supported for `setItem(key, value, { ttl: number /* seconds */ })`
