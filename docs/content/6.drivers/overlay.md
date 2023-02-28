---
navigation.title: Overlay (special)
---

# Overlay Driver

This is a special driver that creates a multi-layer overlay driver.

All write operations happen on the top level layer while values are read from all layers.

When removing a key, a special value `__OVERLAY_REMOVED__` will be set on the top level layer internally.

In the example below, we create an in-memory overlay on top of fs. No changes will be actually written to the disk when setting new keys.

```js
import { createStorage } from "unstorage";
import overlay from "unstorage/drivers/overlay";
import memory from "unstorage/drivers/memory";
import fs from "unstorage/drivers/fs";

const storage = createStorage({
  driver: overlay({
    layers: [
      memory(),
      fs({ base: "./data" })
    ],
  }),
});
```
