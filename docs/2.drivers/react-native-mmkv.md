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
- `encryptionKey`: Optional encryption key. Max 16 bytes with `AES-128` (default), 32 bytes with `AES-256`.
- `encryptionType`: `AES-128` (default) or `AES-256`.
- `mode`: `single-process` (default) or `multi-process`.
- `readOnly`: If true, storage is read-only. Default: `false`.
- `lib`: An imported `react-native-mmkv` module or a function that returns it.

The driver supports `watch` via MMKV's `addOnValueChangedListener` for key updates. The library is loaded lazily on first use, so install it only in React Native targets that actually use this driver.

**Requirements:** react-native-mmkv v4 is built on Nitro Modules. It requires React Native 0.75+ and the [`react-native-nitro-modules`](https://github.com/margelo/nitro) peer dependency (installed automatically with react-native-mmkv).
