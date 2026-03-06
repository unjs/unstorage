---
icon: simple-icons:tauri
---

# Tauri Store

> Store data via [Tauri Store Plugin](https://tauri.app/plugin/store) in Tauri desktop/mobile apps.

::read-more{to="https://tauri.app/plugin/store"}
Learn more about Tauri Store Plugin.
::

## Usage

**Driver name:** `tauri`

Install the Tauri store plugin in your Tauri project, then install unstorage:

:pm-install{name="@tauri-apps/plugin-store"}

Usage:

```js
import { createStorage } from "unstorage";
import tauriDriver from "unstorage/drivers/tauri";

const storage = createStorage({
  driver: tauriDriver({
    path: "store.json",
    base: "app",
    options: { autoSave: 100 },
  }),
});
```

**Options:**

- `path`: Path to the store file (e.g. `"store.json"`). Required.
- `base`: Optional prefix for all keys (namespace).
- `options`: Optional [StoreOptions](https://tauri.app/plugin/store/) from `@tauri-apps/plugin-store` (e.g. `autoSave`: `false` to disable auto-save, or a number for debounce ms; default 100).

The driver supports `watch` via the store’s `onChange` listener for key updates.
