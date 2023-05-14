---
navigation.title: IDB Keyval
---

# IDB Keyval

Store data in [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) using [idb-keyval](https://github.com/jakearchibald/idb-keyval).

```js
import { createStorage } from "unstorage";
import idbKeyvalDriver from "unstorage/drivers/idb-keyval";

const storage = createStorage({
  driver: idbKeyvalDriver({ base: "app:" }),
});
```

**Options:**

- `base`: Add `${base}:` to all keys to avoid collision
- `dbName`: Custom name for database. Defaults to `keyval-store`
- `storeName`: Custom name for store. Defaults to `keyval`
