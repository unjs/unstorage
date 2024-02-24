# UploadThing

Store data using UploadThing.

::note{to="https://uploadthing.com/"}
Learn more about UploadThing.
::

```js
import { createStorage } from "unstorage";
import uploadthingDriver from "unstorage/drivers/uploadthing";

const storage = createStorage({
  driver: uploadthingDriver({
    // apiKey: "<your api key>",
  }),
});
```

To use, you will need to install `uploadthing` dependency in your project:

```json
{
  "dependencies": {
    "uploadthing": "latest"
  }
}
```

**Options:**

- `apiKey`: Your UploadThing API key. Will be automatically inferred from the `UPLOADTHING_SECRET` environment variable if not provided.
