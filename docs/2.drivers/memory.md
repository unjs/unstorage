---
icon: bi:memory
---

# Memory

> Keep data in memory.

Keeps data in memory using [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map). (default storage)

::note
By default it is mounted to top level so it is unlikely you need to mount it again.
::

```js
import { createStorage } from "unstorage";
import memoryDriver from "unstorage/drivers/memory";

const storage = createStorage({
  driver: memoryDriver(),
});
```
