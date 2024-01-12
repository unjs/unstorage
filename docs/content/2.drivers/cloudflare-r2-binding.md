---
title: CloudFlare R2 (binding)
description: Store data in Cloudflare R2 buckets and access from worker bindings.
---

::callout{color="amber" icon="i-ph-warning-duotone"}
This is an experimental driver! This driver only works in a cloudflare worker environment and cannot be used in other runtime environments such as Node.js (r2-http driver is coming soon)
::

::callout{to="https://developers.cloudflare.com/r2/api/workers/workers-api-reference/" target="_blank" icon="i-ph-info-duotone" color="blue"}
Learn more about Cloudflare R2 buckets.
::

You need to create and assign a R2 bucket. See [R2 Bindings](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/#create-a-binding) for more information.

```js
import { createStorage } from "unstorage";
import cloudflareR2BindingDriver from "unstorage/drivers/cloudflare-r2-binding";

// Using binding name to be picked from globalThis
const storage = createStorage({
  driver: cloudflareR2BindingDriver({ binding: "BUCKET" }),
});

// Directly setting binding
const storage = createStorage({
  driver: cloudflareR2BindingDriver({ binding: globalThis.BUCKET }),
});

// Using from Durable Objects and Workers using Modules Syntax
const storage = createStorage({
  driver: cloudflareR2BindingDriver({ binding: this.env.BUCKET }),
});
```

**Options:**

- `binding`: Bucket binding or name. Default is `BUCKET`.
- `base`: Prefix all keys with base.
