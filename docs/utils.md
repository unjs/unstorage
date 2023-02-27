## Storage Utilities

### `snapshot(storage, base?)`

Snapshot from all keys in specified base into a plain javascript object (string: string). Base is removed from keys.

```js
import { snapshot } from "unstorage";

const data = await snapshot(storage, "/etc");
```

### `restoreSnapshot(storage, data, base?)`

Restore snapshot created by `snapshot()`.

```js
await restoreSnapshot(storage, { "foo:bar": "baz" }, "/etc2");
```

### `prefixStorage(storage, data, base?)`

Create a namespaced instance of main storage.

All operations are virtually prefixed. Useful to create shorcuts and limit access.

```js
import { createStorage, prefixStorage } from "unstorage";

const storage = createStorage();
const assetsStorage = prefixStorage(storage, "assets");

// Same as storage.setItem('assets:x', 'hello!')
await assetsStorage.setItem("x", "hello!");
```
