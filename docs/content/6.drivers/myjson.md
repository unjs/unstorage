# myJson

::alert
This is an experimental driver! This driver has not been fully tested with the myJson APIs.
::

Store JSON data via [myJson](https://myjson.online).

```js
import { createStorage } from "unstorage";
import myJsonDriver from "unstorage/drivers/myjson";

const storage = createStorage({
  driver: myJsonDriver({
    accessToken: "ACCESS TOKEN",
    collectionId: "COLLECTION ID",
  }),
});
```

**Options:**

- `accessToken`: Access Token for the collection (**required**)
- `collectionId`: Collection ID for all requests (**required**)
- `headers`: Custom headers to send on all requests

**Supported HTTP Methods:**

- `getItem`: Get a record. Returns deserialized value if response is ok
- `hasItem`: Returns `true` if response is ok (200)
- `setItem`: Create a record if record doesn't exists, update specific property of the record if `patch` option is `true`, or update a record.
- `removeItem`: Delete a record.
- `clear`: Delete all records in a collection.

**Transaction Options:**

- `headers`: Custom headers to be sent on each operation (`getItem`, `setItem`, etc)
