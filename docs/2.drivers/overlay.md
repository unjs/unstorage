---
icon: carbon:overlay
---

# Overlay

> Add a writable layer over one or more fallback drivers.

The overlay reads layers in order and returns the first matching value. All writes go to the first layer, so lower layers remain unchanged.

```ts
import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";
import memoryDriver from "unstorage/drivers/memory";
import overlayDriver from "unstorage/drivers/overlay";

const storage = createStorage({
  driver: overlayDriver({
    layers: [
      memoryDriver(), // writable top layer
      fsDriver({ base: "./data" }), // read-only through the overlay
    ],
  }),
});
```

Setting a value only changes the memory layer. Removing a key writes an internal tombstone to the first layer so a value with the same key in a lower layer stays hidden.

```ts
await storage.setItem("config:theme", "dark");
await storage.removeItem("defaults:locale");
```

::caution
The overlay uses the reserved string `__OVERLAY_REMOVED__` as its tombstone. Do not store that exact string as an application value in an overlay layer.
::

## Limitations

- Put a writable driver first if the overlay will receive writes.
- Native raw values, metadata, and backend watching are not implemented.
- Clearing uses the storage fallback and writes tombstones for visible keys, which can be expensive.
- Disposing the overlay disposes every layer.
