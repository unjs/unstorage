---
navigation.title: Node.js Filesystem
---

# Node.js Filesystem

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
