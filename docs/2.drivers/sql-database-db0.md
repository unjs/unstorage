---
icon: ph:database
---

# SQL Database (db0)

> Store data in a relational database with db0.

## Usage

This driver stores KV information in an SQL database with columns of `id`, `value`, `created_at` and `updated_at`.

To use, you will need to install `db0` in your project:

:pm-install{name="db0"}

Select and configure the appropriate connector for your database.

::important{to="https://db0.unjs.io/connectors"}
Learn more about configuring connectors in the `db0` documentation.
::

You can then configure the driver like this:

```js
import { createDatabase } from "db0";
import { createStorage } from "unstorage";
import db0Driver from "unstorage/drivers/db0";
import sqlite from "db0/connectors/better-sqlite3";

const database = createDatabase(
  sqlite({
    /* db0 connector options */
  })
);

const storage = createStorage({
  driver: db0Driver({
    database,
    table: "custom_table_name", // optional, defaults to "unstorage"
  }),
});
```

::note
The database table is automatically created, no additional setup is required.
::

**Options:**

- **`database`** (required): A `db0` database instance.
- `table`: The name of the table to use. It defaults to `unstorage`.
