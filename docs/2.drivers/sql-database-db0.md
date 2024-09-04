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

Then you can create a table to store your data by running the following query in your database, where `<storage>` is the name of the table you want to use (defaults to `storage`):

::tabs
  ::div
  ---
  label: SQLite
  icon: simple-icons:sqlite
  ---

  ```sql
  CREATE TABLE <storage> (
    id TEXT PRIMARY KEY, 
    value TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP, 
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  ```
  ::

  ::div
  ---
  label: PostgreSQL
  icon: simple-icons:postgresql
  ---

  ```sql
  CREATE TABLE <storage> (
    id VARCHAR(255) NOT NULL PRIMARY KEY, 
    value TEXT, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```
  ::
  
  ::div
  ---
  label: MySQL
  icon: simple-icons:mysql
  ---

  ```sql
  CREATE TABLE <storage> (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    value LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );
  ```
  ::
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
  }),
);

const storage = createStorage({
  driver: db0Driver({
    database,
    dialect: "sqlite",
    /* table: "<storage>", // defaults to "storage" */
  }),
});
```

**Options:**

- **`database`** (required): A `db0` database instance.
- **`dialect`** (required): The SQL dialect of your database: `sqlite`, `postgresql`, or `mysql`.
- `table`: The name of the table to read from. It defaults to `storage`.
