---
icon: ph:database
---

# SQL Database

> Store data in any SQL database.

## Usage

**Driver name:** `db0`

This driver stores KV data in any SQL database using [db0](https://db0.unjs.io).

::warning
Database driver is experimental and behavior may change in the future.
::

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
import dbDriver from "unstorage/drivers/db0";
import sqlite from "db0/connectors/better-sqlite3";

// Learn more: https://db0.unjs.io
const database = createDatabase(
  sqlite({
    /* db0 connector options */
  })
);

const storage = createStorage({
  driver: dbDriver({
    database,
    tableName: "custom_table_name", // Default is "unstorage"
  }),
});
```

::tip
The database table is automatically created, no additional setup is required! <br>
Before first operation, driver ensures a table with columns of `id`, `value`, `blob`, `created_at` and `updated_at` exist.
::

**Options:**

- **`database`** (required): A `db0` database instance.
- `table`: The name of the table to use. It defaults to `unstorage`.
