# Vercel KV

Store data in a [Vercel KV Store](https://vercel.com/docs/storage/vercel-kv).

```js
import { createStorage } from "unstorage";
import vercelKVDriver from "unstorage/drivers/vercel-kv";

const storage = createStorage({
  driver: vercelKVDriver({
    // url: "https://<your-project-slug>.kv.vercel-storage.com", // KV_REST_API_URL
    // token: "<your secret token>", // KV_REST_API_TOKEN
    // base: "test",
    // env: "KV",
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
- `env`: [optional] Flag to customzize environment variable prefix (Default is `KV`). Set to `false` to disable env inference for `url` and `token` options.

See [@upstash/redis](https://docs.upstash.com/redis/sdks/javascriptsdk/advanced) for all available options.
