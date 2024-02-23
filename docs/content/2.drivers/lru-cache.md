# LRU Cache

Keeps cached data in memory using LRU Cache.

## Usage

Keeps cached data in memory using [LRU Cache](https://www.npmjs.com/package/lru-cache).

See [`lru-cache`](https://www.npmjs.com/package/lru-cache) for supported options.

By default [`max`](https://www.npmjs.com/package/lru-cache#max) setting is set to `1000` items.

A default behavior for [`sizeCalculation`](https://www.npmjs.com/package/lru-cache#sizecalculation) option is implemented based on buffer size of both key and value.

```js
import { createStorage } from "unstorage";
import lruCacheDriver from "unstorage/drivers/lru-cache";

const storage = createStorage({
  driver: lruCacheDriver(),
});
```

## Stale while revalidate

LRU cache allows you to easily create a `stale-while-revalidate` storage.

```ts
const staleWhileRevalidateStorage = createStorage({
  driver: driver({
    max: 100,
    ttl: 1000 * 60 * 15, // 15 minutes
    allowStale: true,
    fetchMethod: async (key, value, options) => {
      const data = await fetch("https://your.api.com/endpoint?query${key}");
      return data;
    },
  }),
});

const data = await staleWhileRevalidateStorage.get("my-search-result");
```

That approach will invoke API call maximum once per 15 minutes and will return cached values. Additionally after 15 minutes it will return stale value and will trigger API call in the background to update the cache.
It allows you for great performance and user experience when the accuracy of the returned data is not critical.
