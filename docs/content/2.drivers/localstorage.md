# Local Storage

Store data in localStorage.

## Usage

::tip{to="https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage"}
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
