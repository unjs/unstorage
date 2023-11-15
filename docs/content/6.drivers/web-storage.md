---
navigation.title: Web Storage
---

# Web Storage

Store data in [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) or [sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage).

```js
import { createStorage } from "unstorage";
import webStorageDriver from "unstorage/drivers/web-storage";

const localStorage = createStorage({
  driver: webStorageDriver({ base: "app:", storageArea: window.localStorage }),
});

const sessionStorage = createStorage({
  driver: webStorageDriver({ base: "app:", storageArea: window.sessionStorage }),
});
```

**Options:**

- `base`: Add `${base}:` to all keys to avoid collision
- `storageArea`: Provide [Storage](https://developer.mozilla.org/en-US/docs/Web/API/Storage) object (**required**)
- `window`: Optionally provide `window` object
