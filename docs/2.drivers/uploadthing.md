---
icon: qlementine-icons:cloud-16
---

# UploadThing

> Store data using UploadThing.

::note{to="https://uploadthing.com/"}
Learn more about UploadThing.
::

::warning
UploadThing support is currently experimental!
<br>
There is a known issue that same key, if deleted cannot be used again [tracker issue](https://github.com/pingdotgg/uploadthing/issues/948).
::

## Usage

To use, you will need to install `uploadthing` dependency in your project:

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

- `token`: Your UploadThing API key. Will be automatically inferred from the `UPLOADTHING_SECRET` environment variable if not provided.
