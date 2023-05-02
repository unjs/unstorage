# Vercel KV

Store data in a Vercel [Redis](https://redis.com/) KV store.

```js
import { createStorage } from "unstorage";
import vercelDriver from "unstorage/drivers/vercel-kv";

const storage = createStorage({
  driver: vercelDriver({
    base: "unstorage",
    url: "https://<your-project-slug>.kv.vercel-storage.com",
    token: "<your secret token>",
  }),
});
```

**Options:**

- `base`: Optional prefix to use for all keys. Can be used for namespacing.
- `url`: Url to use for connecting to your Vercel KV store. It has the format `https://<your-project-slug>.kv.vercel-storage.com`

See [@upstash/redis](https://docs.upstash.com/redis/sdks/javascriptsdk/advanced) for all available options.

To use, you will need to install `@vercel/kv` in your project:

```json
{
  "dependencies": {
    "@vercel/kv": "latest"
  }
}
```
