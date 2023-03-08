---
navigation.title: LRU Cache
---

# LRU Cache

Keeps cached data in memory using [LRU Cache](https://www.npmjs.com/package/lru-cache).

See [`lru-cache`](https://www.npmjs.com/package/lru-cache) for supported options. By default `{ max: 500 }` is used.

```js
import { createStorage } from "unstorage";
import lruCacheDriver from "unstorage/drivers/lru-cache";

const storage = createStorage({
  driver: lruCacheDriver(),
});
```
