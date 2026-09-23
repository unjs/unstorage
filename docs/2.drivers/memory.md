---
icon: bi:memory
---

# Memory

> Keep values in the current JavaScript process.

The memory driver uses a `Map` and is the default for `createStorage()`. Data is not shared between processes and is lost when the process exits or the storage is disposed.

```ts
import { createStorage } from "unstorage";

const storage = createStorage();
```

You can also create the driver explicitly:

```ts
import { createStorage } from "unstorage";
import memoryDriver from "unstorage/drivers/memory";

const driver = memoryDriver();
const storage = createStorage({ driver });

const map = driver.getInstance?.();
```

## TTL

Pass a TTL in seconds when setting an item:

```ts
await storage.setItem("session:1", { userId: 1 }, { ttl: 60 });
```

The driver removes the item after the TTL expires. Calling `clear()` or `dispose()` also cancels pending expiration timers.

Use this driver for tests, short-lived caches, and local defaults—not for durable or distributed data.
