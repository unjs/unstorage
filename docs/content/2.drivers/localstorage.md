---
title: Local Storage
description: Store data in localStorage.
---

## Usage

::callout{to="https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage" target="\_blank" icon="i-ph-info-duotone" color="blue"}
Learn more about localStorage.
::

```js
import { createStorage } from "unstorage";
import localStorageDriver from "unstorage/drivers/localstorage";

const storage = createStorage({
  driver: localStorageDriver({ base: "app:" }),
});
```

**Options:**

- `base`: Add `${base}:` to all keys to avoid collision
- `localStorage`: Optionally provide `localStorage` object
- `window`: Optionally provide `window` object
