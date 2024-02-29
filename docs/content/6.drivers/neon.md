# Neon Serverless Postgres

Stores data in [Neon Serverless Postgres](https://neon.tech).

This driver stores Key-Value (KV) information in a Neon Postgres database with columns of `id`, `value`, `created_at` and `updated_at`.

To use, you will need to install [`@neondatabase/serverless`](https://github.com/neondatabase/serverless) in your project. This is the Neon PostgreSQL driver for JavaScript and TypeScript.

```
pnpm add @neondatabase/serverless
```

```json
{
  "dependencies": {
    "@neondatabase/serverless": "^0.6.1"
  }
}
```

Then, create a table to store your data by running the following queries in your Neon database, where <unstorage> is the name of the table you want to use.

This will create a database table and associate a `BEFORE` trigger that will update the `updated_at` timestamp value when a row is modified.

```sql

CREATE OR REPLACE FUNCTION update_modified_column ()
	RETURNS TRIGGER
	AS $$
BEGIN
	NEW.updated_at = now();
	RETURN NEW;
END;
$$
LANGUAGE 'plpgsql';

-- adjust id length and table name, if needed
CREATE TABLE unstorage (
	id varchar(255) NOT NULL PRIMARY KEY,
	value text,
	created_at TIMESTAMP DEFAULT NOW(),
	updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER update_storage_updated_at
	BEFORE UPDATE ON unstorage
	FOR EACH ROW
	EXECUTE PROCEDURE update_modified_column ();

```

Usage:

```js
import { createStorage } from "unstorage";
import neonDriver from "unstorage/drivers/neon";

const storage = createStorage({
  driver: neonDriver({
    // This should be loaded from a runtime config
    // or environment variable.
    url: "<database-url-from-env-variable>",
    // table: 'unstorage'
    // fetchConnectionCache: true,
  }),
});
```

**Options:**

- **`url`** (Required): You can find the database URL in the [Neon Console](https://console.neon.tech/).
- `table`: The name of the table to use. It defaults to `unstorage`.
- [`fetchConnectionCache` (Experimental)](https://neon.tech/docs/serverless/serverless-driver#experimental-connection-caching): When `fetchConnectionCache` is `true`, queries carried via HTTP `fetch` will make use of a connection cache (pool) on the server.

**Advanced:**

If needed, the Neon client can be configured with advanced options using the [`neonConfig` configuration](https://neon.tech/docs/serverless/serverless-driver#advanced-configuration-options).
