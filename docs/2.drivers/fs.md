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
- `atomic`: Write items atomically (see [below](#atomic-writes)). Disabled by default.
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
- `atomic`: Write items atomically (see [below](#atomic-writes)). Disabled by default.

## Atomic writes

By default items are written directly to their destination file. A reader that opens a key while it
is being written can therefore observe a partially written value, and a failed write can leave a
truncated file behind.

Enabling `atomic` writes each item to a temporary file in the same directory and renames it over the
destination, so readers only ever see the complete previous or the complete new value:

```js
const storage = createStorage({
  driver: fsDriver({ base: "./tmp", atomic: true }),
});
```

It is opt-in because renaming replaces the destination file rather than updating it in place:

- Ownership, ACLs and extended attributes are not carried over (the file mode is).
- A key that is a symbolic link is replaced by a regular file instead of being written through.
- Hard links to a key stop tracking it after the next write.
- Small writes are around twice as slow. Large writes are unaffected or slightly faster.
- On Windows, writing a key that another process is holding open can fail with `EPERM`.

Atomic writes protect against interleaved readers, not against power loss: the data is not flushed
to disk before the rename.
