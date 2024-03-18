---
icon: nonicons:capacitor-16
---

# Capacitor Preferences

> Stores data via Capacitor Preferences API on mobile devices or the local storage on the web.

::read-more{to="https://capacitorjs.com/docs/apis/preferences"}
Learn more about Capacitor Preferences API.
::

## Usage

To use this driver, you need to install and sync `@capacitor/preferences` inside your capacitor project:

:pm-install{name="@capacitor/preferences"}
:pm-x{command="cap sync"}

Usage:

```js
import { createStorage } from "unstorage";
import capacitorPreferences from "unstorage/drivers/capacitor-preferences";

const storage = createStorage({
  driver: capacitorPreferences({
    base: "test",
  }),
});
```

**Options:**

- `base`: Add `${base}:` to all keys to avoid collision
