---
title: Vercel KV
description: Store data in a Vercel KV Store.
---

::callout{to="https://vercel.com/docs/storage/vercel-kv" target="_blank" icon="i-ph-info-duotone" color="blue"}
Learn more about Vercel KV.
::

::callout{color="amber" icon="i-ph-warning-duotone"}
Vercel KV driver is in beta. Please check [Vercel KV Limits](https://vercel.com/docs/storage/vercel-kv/limits) and [unjs/unstorage#218](https://github.com/unjs/unstorage/issues/218) for known issues and possible workarounds.
::

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
- `env`: [optional] Flag to customzize environment variable prefix (Default is `KV`). Set to `false` to disable env inference for `url` and `token` options.

See [@upstash/redis](https://docs.upstash.com/redis/sdks/javascriptsdk/advanced) for all available options.
