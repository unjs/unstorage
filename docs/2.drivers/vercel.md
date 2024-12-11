---
icon: gg:vercel
---

# Vercel

## Vercel KV

> Store data in a Vercel KV Store.

::read-more{to="https://vercel.com/docs/storage/vercel-kv"}
Learn more about Vercel KV.
::

> [!NOTE]
> Please check [Vercel KV Limits](https://vercel.com/docs/storage/vercel-kv/limits).

```js
import { createStorage } from "unstorage";
import vercelKVDriver from "unstorage/drivers/vercel-kv";

const storage = createStorage({
  driver: vercelKVDriver({
    // url: "https://<your-project-slug>.kv.vercel-storage.com", // KV_REST_API_URL
    // token: "<your secret token>", // KV_REST_API_TOKEN
    // base: "test",
    // env: "KV",
    // ttl: 60, // in seconds
  }),
});
```

To use, you will need to install `@vercel/kv` dependency in your project:

```json
{
  "dependencies": {
    "@vercel/kv": "latest"
  }
}
```

**Note:** For driver options type support, you might need to install `@upstash/redis` dev dependency as well.

**Options:**

- `url`: Rest API URL to use for connecting to your Vercel KV store. Default is `KV_REST_API_URL`.
- `token`: Rest API Token to use for connecting to your Vercel KV store. Default is `KV_REST_API_TOKEN`.
- `base`: [optional] Prefix to use for all keys. Can be used for namespacing.
- `env`: [optional] Flag to customize environment variable prefix (Default is `KV`). Set to `false` to disable env inference for `url` and `token` options.

See [@upstash/redis](https://docs.upstash.com/redis/sdks/javascriptsdk/advanced) for all available options.

## Vercel Blob

> Store data in a Vercel Blob Store.

::read-more{to="https://vercel.com/docs/storage/vercel-blob"}
Learn more about Vercel Blob.
::

::warning
Currently Vercel Blob stores all data with public access.
::

To use, you will need to install [`@vercel/blob`](https://www.npmjs.com/package/@vercel/blob) dependency in your project:

:pm-install{name="@vercel/blob"}

```js
import { createStorage } from "unstorage";
import vercelBlobDriver from "unstorage/drivers/vercel-blob";

const storage = createStorage({
  driver: vercelBlobDriver({
    access: "public", // Required! Beware that stored data is publicly accessible.
    // token: "<your secret token>", // or set BLOB_READ_WRITE_TOKEN
    // base: "unstorage",
    // envPrefix: "BLOB",
  }),
});
```

**Options:**

- `access`: Whether the blob should be publicly accessible. (required, must be `public`)
- `base`: Prefix to prepend to all keys. Can be used for namespacing.
- `token`: Rest API token to use for connecting to your Vercel Blob store. If not provided, it will be read from the environment variable `BLOB_READ_WRITE_TOKEN`.
- `envPrefix`: Prefix to use for token environment variable name. Default is `BLOB` (env name = `BLOB_READ_WRITE_TOKEN`).
