---
title: MongoDB
description: Store data in MongoDB using Node.js mongodb package.
---

Learn more about [MongoDB](https://www.npmjs.com/package/mongodb) and [Node.js mongodb package](https://www.npmjs.com/package/mongodb)

This driver stores KV information in a MongoDB collection with a separate document for each key value pair.

To use it, you will need to install `mongodb` in your project:

```bash
npm i mongodb
```

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
