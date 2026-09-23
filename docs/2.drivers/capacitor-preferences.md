---
icon: nonicons:capacitor-16
---

# Capacitor Preferences

> Store data via Capacitor Preferences API on mobile devices or local storage on the web.

::read-more{to="https://capacitorjs.com/docs/apis/preferences"}
Learn more about Capacitor Preferences API.
::

## Usage

**Driver name:** `capacitor-preferences`

Install and sync `@capacitor/preferences` in your Capacitor project:

:pm-install{name="@capacitor/preferences"}
:pm-x{command="cap sync"}

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

- `base`: Prefixes all keys to avoid collisions.
- `lib`: An imported `@capacitor/preferences` module or a function that returns it.
