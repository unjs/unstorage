# Vercel KV

Store data in a [Vercel KV Store](https://vercel.com/docs/storage/vercel-kv).

```js
import { createStorage } from "unstorage";
import vercelKVDriver from "unstorage/drivers/vercel-kv";

const storage = createStorage({
  driver: vercelKVDriver({
    // base: "unstorage",
    url: "https://<your-project-slug>.kv.vercel-storage.com",
    token: "<your secret token>",
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

- `base`: Optional prefix to use for all keys. Can be used for namespacing.
- `url`: Url to use for connecting to your Vercel KV store. It has the format `https://<your-project-slug>.kv.vercel-storage.com`

See [@upstash/redis](https://docs.upstash.com/redis/sdks/javascriptsdk/advanced) for all available options.
