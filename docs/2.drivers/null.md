---
icon: bi:trash3-fill
---

# Null

> Disable storage by discarding every write.

The null driver behaves like [`/dev/null`](https://en.wikipedia.org/wiki/Null_device): writes succeed without storing data, reads return `null`, `hasItem` returns `false`, and `getKeys` returns an empty array.

```ts
import { createStorage } from "unstorage";
import nullDriver from "unstorage/drivers/null";

const storage = createStorage({
  driver: nullDriver(),
});
```

It is useful as an explicit no-op backend when storage or caching is optional.
