---
icon: teenyicons:mongodb-outline
---

# MongoDB

> Store data in MongoDB using Node.js MongoDB package.

## Usage

::read-more{to="https://www.mongodb.com/"}
Learn more about MongoDB.
::

This driver stores KV information in a MongoDB collection with a separate document for each key value pair.

To use it, you will need to install `mongodb` in your project:

:pm-install{name="mongodb"}

Usage:

```js
import { createStorage } from "unstorage";
import mongodbDriver from "unstorage/drivers/mongodb";

const storage = createStorage({
  driver: mongodbDriver({
    connectionString: "CONNECTION_STRING",
    databaseName: "test",
    collectionName: "test",
  }),
});
```

**Authentication:**

The driver supports the following authentication methods:

- **`connectionString`**: The MongoDB connection string. This is the only way to authenticate.

**Options:**

- **`connectionString`** (required): The connection string to use to connect to the MongoDB database. It should be in the format `mongodb://<username>:<password>@<host>:<port>/<database>`.
- `databaseName`: The name of the database to use. Defaults to `unstorage`.
- `collectionName`: The name of the collection to use. Defaults to `unstorage`.
