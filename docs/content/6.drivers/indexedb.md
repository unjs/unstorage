---
navigation.title: IndexedDB
---

# IndexedDB

Store data in [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) using [idb-keyval](https://github.com/jakearchibald/idb-keyval).

To use it, you will need to install `idb-keyval` in your project:

```bash
npm i idb-keyval
```

Usage:

```js
import { createStorage } from "unstorage";
import indexedDbDriver from "unstorage/drivers/indexeddb";

const storage = createStorage({
  driver: indexedDbDriver({ base: "app:" }),
});
```

**Options:**

- `base`: Add `${base}:` to all keys to avoid collision
- `dbName`: Custom name for database. Defaults to `keyval-store`
- `storeName`: Custom name for store. Defaults to `keyval`

::alert{type="info"}
IndexedDB is a browser database. avoid using this preset on server environments.
::
