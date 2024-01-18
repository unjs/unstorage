---
title: Capacitor Preferences
description: Stores data via Capacitor Preferences API on mobile devices or the local storage on the web.
---

## Usage

::tip{to="https://capacitorjs.com/docs/apis/preferences"}
Learn more about Capacitor Preferences API.
::

To use this driver, you need to install and sync `@capacitor/preferences` inside your capacitor project:

::code-group

```sh [npm]
npm install @capacitor/preferences
npx cap sync
```

```sh [Yarn]
yarn add @capacitor/preferences
npx cap sync
```

```sh [pnpm]
pnpm add @capacitor/preferences
pnpm cap sync
```

::

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
