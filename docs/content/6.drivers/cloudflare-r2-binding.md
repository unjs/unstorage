# CloudFlare R2 (binding)

::alert
This is an experimental driver! This driver only works in a cloudflare worker environment and cannot be used in other runtime environments such as Node.js (r2-http driver is coming soon)
::

Store data in [Cloudflare R2](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/) buckets and access from worker bindings.

You need to create and assign a R2 bucket. See [R2 Bindings](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/#create-a-binding) for more information.

```js
import { createStorage } from "unstorage";
import cloudflareR2BindingDriver from "unstorage/drivers/cloudflare-r2-binding";

// Using binding name to be picked from globalThis
const storage = createStorage({
  driver: cloudflareR2BindingDriver({ binding: "MY_BUCKET" }),
});

// Directly setting binding
const storage = createStorage({
  driver: cloudflareR2BindingDriver({ binding: globalThis.MY_BUCKET }),
});
```

**Options:**

- `binding`: Bucket binding or name.
- `base`: Prefix all keys with base.
