---
icon: simple-icons:react
---

# React Native (MMKV)

> Store data via [react-native-mmkv](https://github.com/mrousavy/react-native-mmkv) in React Native apps. Fast key-value storage (~30x faster than AsyncStorage).

::read-more{to="https://github.com/mrousavy/react-native-mmkv"}
Learn more about react-native-mmkv.
::

## Usage

**Driver name:** `react-native-mmkv`

Install the package in your React Native project, then use unstorage:

:pm-install{name="react-native-mmkv"}
:pm-install{name="unstorage"}

Usage:

```js
import { createStorage } from "unstorage";
import reactNativeMmkv from "unstorage/drivers/react-native-mmkv";

const storage = createStorage({
  driver: reactNativeMmkv({
    id: "app-storage",
    base: "app",
    encryptionKey: "optional-encryption-key",
  }),
});
```

**Options:**

- `base`: Optional prefix for all keys (namespace).
- `id`: MMKV instance ID (default: `mmkv.default`). Use different IDs for multiple instances.
- `path`: Custom root path for the storage file.
- `encryptionKey`: Optional encryption key (max 16 bytes).
- `mode`: `SINGLE_PROCESS` (default) or `MULTI_PROCESS`.
- `readOnly`: If `true`, storage is read-only. Default: `false`.

The driver supports `watch` via MMKV’s `addOnValueChangedListener` for key updates.
