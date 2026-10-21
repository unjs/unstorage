---
icon: ph:database
---

# SQL Database

> Store data in a supported SQL database through db0.

## Usage

**Driver name:** `db0`

This driver stores key-value data through [db0](https://db0.unjs.io). It supports db0 connections using the `sqlite`, `libsql`, `postgresql`, and `mysql` dialects.

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
const database = createDatabase(sqlite({/* db0 connector options */}));

const storage = createStorage({
  driver: dbDriver({
    database,
    tableName: "custom_table_name", // Default is "unstorage"
  }),
});
```

::tip
By default, no manual schema setup is required. Before the first operation, the driver creates a table with `key`, `value`, `blob`, `created_at`, and `updated_at` columns when it does not already exist.
::

**Options:**

- **`database`** (required): A `db0` database instance.
- `tableName`: The name of the table to use. It defaults to `unstorage`.
- `autoSetup`: Automatically create the table before the first operation. Defaults to `true`. Set to `false` to use a table provisioned separately, for example when the database user does not have permission to create tables.

When `autoSetup` is `false`, the driver does not run `CREATE TABLE`. Provision the table before using the driver, for example through application migrations. The table must provide the columns expected by the driver: `key` as the primary key, plus `value`, `blob`, `created_at`, and `updated_at`, with compatible database types. Refer to the [driver's table definitions](https://github.com/unjs/unstorage/blob/main/src/drivers/db0.ts) for the column types used by each SQL dialect.

Database errors are propagated unchanged. If the table is missing, the operation fails with the database's original error.

```js
const storage = createStorage({
  driver: dbDriver({
    database,
    autoSetup: false,
  }),
});
```
