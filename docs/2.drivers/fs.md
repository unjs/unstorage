---
icon: ph:file-light
---

# Filesystem (Node.js)

> Store data in the filesystem using Node.js API.

## Usage

**Driver name:** `fs` or `fs-lite`

Maps data to the real filesystem using directory structure for nested keys. Supports watching using [chokidar](https://github.com/paulmillr/chokidar).

Watching requires `chokidar` to be installed (all other operations work without it):

:pm-install{name="chokidar"}

This driver implements meta for each key including `mtime` (last modified time), `atime` (last access time), and `size` (file size) using `fs.stat`.

```js
import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";

const storage = createStorage({
  driver: fsDriver({ base: "./tmp" }),
});
```

**Options:**

- `base` (**required**): Directory used as the storage root.
- `ignore`: Glob patterns ignored by watching and key listing.
- `readOnly`: Disables write and removal operations.
- `noClear`: Disables clearing.
- `watchOptions`: Additional [chokidar](https://github.com/paulmillr/chokidar) options.
- `lib`: An imported `chokidar` module or a function that returns it.

## Node.js Filesystem (Lite)

This driver uses pure Node.js API without extra dependencies.

```js
import { createStorage } from "unstorage";
import fsLiteDriver from "unstorage/drivers/fs-lite";

const storage = createStorage({
  driver: fsLiteDriver({ base: "./tmp" }),
});
```

**Options:**

- `base` (**required**): Directory used as the storage root.
- `ignore`: Optional callback `(path: string) => boolean`.
- `readOnly`: Disables write and removal operations.
- `noClear`: Disables clearing.
