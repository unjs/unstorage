---
navigation.title: Origin Private File System
---

# Origin Private File System

Maps data to the [origin private file system (OPFS)](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system) using directory structure for nested keys.

This driver implements meta for each key including `mtime` (last modified time), `type` (mime type) and `size` (file size) of the underlying [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File) object.

The origin private file system cannot be watched.

```js
import { createStorage } from "unstorage";
import opfsDriver from "unstorage/drivers/opfs";

const storage = createStorage({
  driver: opfsDriver({ base: "tmp" }),
});
```

**Options:**

- `base`: Base directory to isolate operations on this directory
- `ignore`: Ignore patterns for key listing
- `readOnly`: Whether to ignore any write operations
- `noClear`: Whether to disallow clearing the storage
- `fs`: An alternative file system handle using the [`FileSystemDirectoryHandle`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle) interface (e.g. the user's native file system using `window.showDirectoryPicker()`)
