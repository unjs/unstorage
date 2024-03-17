----
icon: ph:browser-thin
---

# Browser

> Browser based storages

## Local Storage

Store data in localStorage.

### Usage

::read-more{to="https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage"}
Learn more about localStorage.
::

```js
import { createStorage } from "unstorage";
import localStorageDriver from "unstorage/drivers/localstorage";

const storage = createStorage({
  driver: localStorageDriver({ base: "app:" }),
});
```

**Options:**

- `base`: Add `${base}:` to all keys to avoid collision
- `localStorage`: Optionally provide `localStorage` object
- `window`: Optionally provide `window` object

## Session Storage

> Store data in sessionStorage.

::read-more{to="https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage"}
Learn more about sessionStorage.
::

```js
import { createStorage } from "unstorage";
import sessionStorageDriver from "unstorage/drivers/session-storage";

const storage = createStorage({
  driver: sessionStorageDriver({ base: "app:" }),
});
```

**Options:**

- `base`: Add `${base}:` to all keys to avoid collision
- `sessionStorage`: Optionally provide `sessionStorage` object
- `window`: Optionally provide `window` object

## IndexedDB

Store key-value in IndexedDB.

### Usage

::read-more{to="https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API"}
Learn more about IndexedDB.
::

To use it, you will need to install [`idb-keyval`](https://github.com/jakearchibald/idb-keyval) in your project:

:pm-install{name="idb-keyval"}

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
