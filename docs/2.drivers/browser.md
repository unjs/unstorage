---
icon: ph:browser-thin
---

# Browser

> Store values in `localStorage`, `sessionStorage`, or IndexedDB.

These drivers require browser APIs. Avoid creating them during server-side rendering unless you provide a compatible storage object.

## Local storage

**Driver import:** `unstorage/drivers/localstorage`

```ts
import { createStorage } from "unstorage";
import localStorageDriver from "unstorage/drivers/localstorage";

const storage = createStorage({
  driver: localStorageDriver({ base: "my-app" }),
});
```

### Options

- `base`: Prefixes keys to avoid collisions with other applications.
- `storage`: A `localStorage`-compatible object. By default, the driver uses `window.localStorage`.
- `windowKey`: Selects `"localStorage"` (default) or `"sessionStorage"` from the window object.
- `window`: A custom `window` object. Pass it to enable native `storage` event watching.

## Session storage

**Driver import:** `unstorage/drivers/session-storage`

The session driver has the same options as the local storage driver but selects `window.sessionStorage` by default.

```ts
import { createStorage } from "unstorage";
import sessionStorageDriver from "unstorage/drivers/session-storage";

const storage = createStorage({
  driver: sessionStorageDriver({ base: "my-app" }),
});
```

::note
Web Storage values are scoped to the browser origin. `sessionStorage` is additionally scoped to the current tab and is cleared when that tab's session ends.
::

## IndexedDB

**Driver import:** `unstorage/drivers/indexeddb`

The IndexedDB driver uses [`idb-keyval`](https://github.com/jakearchibald/idb-keyval).

:pm-install{name="idb-keyval"}

```ts
import { createStorage } from "unstorage";
import indexedDBDriver from "unstorage/drivers/indexeddb";

const storage = createStorage({
  driver: indexedDBDriver({
    base: "my-app",
    dbName: "my-app-db",
    storeName: "keyval",
  }),
});
```

### Options

- `base`: Prefixes all keys.
- `dbName`: Custom database name. Set it together with `storeName`.
- `storeName`: Custom object store name. Set it together with `dbName`.
- `lib`: An imported `idb-keyval` module or a function that returns it. See [Driver dependencies](/drivers#driver-dependencies).

When `dbName` and `storeName` are omitted, `idb-keyval` uses its default `keyval-store` database and `keyval` object store.

The regular API stores serialized values. Use the experimental raw API to preserve IndexedDB-native structured clone values:

```ts
await storage.setItemRaw("profile", { name: "Ada" });
const profile = await storage.getItemRaw("profile");
```
