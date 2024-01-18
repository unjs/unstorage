# IndexedDB

Store key-value in IndexedDB.

## Usage

::tip{to="https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API"}
Learn more about IndexedDB.
::

To use it, you will need to install [`idb-keyval`](https://github.com/jakearchibald/idb-keyval) in your project:

```bash [Terminal]
npm i idb-keyval
```

Usage:

```js
import { createStorage } from "unstorage";
import indexedDbDriver from "unstorage/drivers/indexedb";

const storage = createStorage({
  driver: indexedDbDriver({ base: "app:" }),
});
```

**Options:**

- `base`: Add `${base}:` to all keys to avoid collision
- `dbName`: Custom name for database. Defaults to `keyval-store`
- `storeName`: Custom name for store. Defaults to `keyval`

::note
IndexedDB is a browser database. avoid using this preset on server environments.
::
