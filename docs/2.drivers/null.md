---
icon: bi:trash3-fill
---

# Null

> Discards all data.

::warning
This driver does NOT store any data. It will discard any data written to it and will always return null similar to [`/dev/null`](https://en.wikipedia.org/wiki/Null_device)
::

## Usage

**Driver name:** `null`

```js
import { createStorage } from "unstorage";
import nullDriver from "unstorage/drivers/null";

const storage = createStorage({
  driver: nullDriver(),
});
```
