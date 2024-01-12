---
title: Node.js Filesystem
description: Store data in the real filesystem using Node.js API.
---

## Usage

Maps data to the real filesystem using directory structure for nested keys. Supports watching using [chokidar](https://github.com/paulmillr/chokidar).

This driver implements meta for each key including `mtime` (last modified time), `atime` (last access time), and `size` (file size) using `fs.stat`.

```js
import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";

const storage = createStorage({
  driver: fsDriver({ base: "./tmp" }),
});
```

**Options:**

- `base`: Base directory to isolate operations on this directory
- `ignore`: Ignore patterns for watch <!-- and key listing -->
- `watchOptions`: Additional [chokidar](https://github.com/paulmillr/chokidar) options.

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

- `base`: Base directory to isolate operations on this directory
- `ignore`: Optional callback function `(path: string) => boolean`
