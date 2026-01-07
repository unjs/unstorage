---
icon: mdi:puzzle-outline
---

# Web Extension Storage

> Store data in browser extension storage areas (`local`, `session`, `sync`, `managed`).

## Usage

**Driver name:** `web-extension-storage`

::read-more{to="https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage"}
Learn more about the Web Extension Storage API.
::

```js
import { createStorage } from "unstorage";
import webExtensionStorageDriver from "unstorage/drivers/web-extension-storage";

const storage = createStorage({
  driver: webExtensionStorageDriver({ storageArea: "local" }),
});
```

::note
Ensure the `"storage"` permission is declared in your extension's `manifest.json`:
```json
{
  "permissions": ["storage"]
}
```
::

**Options:**

- `storageArea`: Storage area to use. Can be `"local"` (default), `"session"`, `"sync"`, or `"managed"`.
- `base`: Add `${base}:` prefix to all keys to avoid collisions.

## Storage Areas

- **`local`**: Persistent storage, data survives browser restarts. ~5MB limit.
- **`session`**: Cleared when the browser session ends. ~10MB limit.
- **`sync`**: Synced across devices when user is signed in. ~100KB limit.
- **`managed`**: Read-only, set by enterprise policies.
