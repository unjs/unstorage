# Memcached

Store data in [Memcached](https://memcached.org/) using the [3rd-Eden/memcached](https://github.com/3rd-Eden/memcached) library.

::alert{type="warning"}
Memcached does _NOT_ supports the `getKeys` method. It will always return an empty array.
::

Usage with a Memcached server:

```js
import { createStorage } from "unstorage";
import memcachedDriver from "unstorage/drivers/memcached";

const storage = createStorage({
  driver: memcachedDriver({
    location: "localhost:11211",
    defaultTTL: 0, //default
    options: {},
  }),
});
```

## Location

- Single server: `127.0.0.1:11211`
- Cluster of Memcached servers : `["127.0.0.1:11211","127.0.0.1:11212"]`
- Servers with weight : `{"127.0.0.1:11211": 1,"127.0.0.1:11212": 2}`

## TTL

Memcached requires that you set a key `ttl` (expiration time) for each key. Unstorage exposes a `defaultTTL` setting to configure the driver,
which allows you to not specify the ttl for each key. By default this value is set to 0, which means the keys will never expire.

You can override the default value like this :

```ts
await storage.set("hello", "world", { ttl: 60 }); // expires in 60 seconds
```

## Options

This is the full list of options supported by the uderlying driver.

```ts
interface options {
  /**
   * 250, the maximum key size allowed.
   */
  maxKeySize?: number | undefined;
  /**
   * 2592000, the maximum expiration time of keys (in seconds).
   */
  maxExpiration?: number | undefined;
  /**
   * 1048576, the maximum size of a value.
   */
  maxValue?: number | undefined;
  /**
   * 10, the maximum size of the connection pool.
   */
  poolSize?: number | undefined;
  /**
   * md5, the hashing algorithm used to generate the hashRing values.
   */
  algorithm?: string | undefined;
  /**
   * 18000000, the time between reconnection attempts (in milliseconds).
   */
  reconnect?: number | undefined;
  /**
   * 5000, the time after which Memcached sends a connection timeout (in milliseconds).
   */
  timeout?: number | undefined;
  /**
   * 5, the number of socket allocation retries per request.
   */
  retries?: number | undefined;
  /**
   * 5, the number of failed-attempts to a server before it is regarded as 'dead'.
   */
  failures?: number | undefined;
  /**
   * 30000, the time between a server failure and an attempt to set it up back in service.
   */
  retry?: number | undefined;
  /**
   * false, if true, authorizes the automatic removal of dead servers from the pool.
   */
  remove?: boolean | undefined;
  /**
   * undefined, an array of server_locations to replace servers that fail and that are removed from the consistent hashing scheme.
   */
  failOverServers?: string | string[] | undefined;
  /**
   * true, whether to use md5 as hashing scheme when keys exceed maxKeySize.
   */
  keyCompression?: boolean | undefined;
  /**
   * 5000, the idle timeout for the connections.
   */
  idle?: number | undefined;
  /**
   * '', sentinel to prepend to all memcache keys for namespacing the entries.
   */
  namespace?: string | undefined;
}
```

Refer to [memcached](https://github.com/3rd-Eden/memcached) for the full driver documentation.
