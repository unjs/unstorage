---
title: IndexedDB
description: Store data in IndexedDB using idb-keyval.
---

Learn more about [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) and [idb-keyval](https://github.com/jakearchibald/idb-keyval).

To use it, you will need to install `idb-keyval` in your project:

```bash
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

::callout{ color="blue" icon="i-ph-info-duotone" }
IndexedDB is a browser database. avoid using this preset on server environments.
::
