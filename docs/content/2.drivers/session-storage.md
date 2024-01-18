---
title: Session Storage
description: Store data in sessionStorage.
---

# Session Storage

::callout{to="https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage" target="\_blank" icon="i-ph-info-duotone" color="blue"}
Learn more about sessionStorage.
::

```js
import { createStorage } from "unstorage";
import sessionStorageDriver from "unstorage/drivers/session-storage";

const storage = createStorage({
  driver: sessionStorageDriver({ base: "app:" }),
});
```

**Options:**

- `base`: Add `${base}:` to all keys to avoid collision
- `sessionStorage`: Optionally provide `sessionStorage` object
- `window`: Optionally provide `window` object
