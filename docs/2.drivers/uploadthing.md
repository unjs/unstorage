---
icon: qlementine-icons:cloud-16
---

# UploadThing

> Store data using UploadThing.

::note{to="https://uploadthing.com/"}
Learn more about UploadThing.
::

::warning
UploadThing support is experimental. A deleted key currently cannot be reused; follow the [upstream issue](https://github.com/pingdotgg/uploadthing/issues/948) for updates.
::

## Usage

**Driver name:** `uploadthing`

Install the `uploadthing` dependency:

:pm-install{name="uploadthing"}

```js
import { createStorage } from "unstorage";
import uploadthingDriver from "unstorage/drivers/uploadthing";

const storage = createStorage({
  driver: uploadthingDriver({
    // token: "<your token>", // UPLOADTHING_SECRET environment variable will be used if not provided.
  }),
});
```

**Options:**

- `token`: UploadThing API token. When omitted, UploadThing uses its supported environment configuration.
- `base`: Optional prefix for all keys.
- `lib`: An imported `uploadthing/server` module or a function that returns it.
