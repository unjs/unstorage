---
icon: simple-icons:planetscale
---

# PlanetScale

> Store data in MySQL database via PlanetScale.

## Usage

::read-more{to="https://docs.microsoft.com/en-us/azure/key-vault/secrets/about-secrets"}
Learn more about PlanetScale.
::

This driver stores KV information in a Planetscale DB with columns of `id`, `value`, `created_at` and `updated_at`.

To use, you will need to install `@planetscale/database` in your project:

```json
{
  "dependencies": {
    "@planetscale/database": "^1.5.0"
  }
}
```

Then you can create a table to store your data by running the following query in your Planetscale database, where `<storage>` is the name of the table you want to use:

```
create table <storage> (
 id varchar(255) not null primary key,
 value longtext,
 created_at timestamp default current_timestamp,
 updated_at timestamp default current_timestamp on update current_timestamp
);
```

You can then configure the driver like this:

```js
import { createStorage } from "unstorage";
import planetscaleDriver from "unstorage/drivers/planetscale";

const storage = createStorage({
  driver: planetscaleDriver({
    // This should certainly not be inlined in your code but loaded via runtime config
    // or environment variables depending on your framework/project.
    url: "mysql://xxxxxxxxx:************@xxxxxxxxxx.us-east-3.psdb.cloud/my-database?sslaccept=strict",
    // table: 'storage'
  }),
});
```

**Options:**

- **`url`** (required): You can find your URL in the [Planetscale dashboard](https://planetscale.com/docs/tutorials/connect-nodejs-app).
- `table`: The name of the table to read from. It defaults to `storage`.
- `boostCache`: Whether to enable cached queries: See [docs](https://planetscale.com/docs/concepts/query-caching-with-planetscale-boost#using-cached-queries-in-your-application).
