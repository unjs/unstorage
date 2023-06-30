# CloudFlare KV (binding)

Store data in [Cloudflare KV](https://developers.cloudflare.com/workers/runtime-apis/kv) and access from worker bindings.

**Note:** This driver only works in a cloudflare worker environment, use [`cloudflare-kv-http`](/drivers/cloudflare-kv-http) for other environments.

You need to create and assign a KV. See [KV Bindings](https://developers.cloudflare.com/workers/runtime-apis/kv#kv-bindings) for more information.

```js
import { createStorage } from "unstorage";
import cloudflareKVBindingDriver from "unstorage/drivers/cloudflare-kv-binding";

// Using binding name to be picked from globalThis
const storage = createStorage({
  driver: cloudflareKVBindingDriver({ binding: "STORAGE" }),
});

// Directly setting binding
const storage = createStorage({
  driver: cloudflareKVBindingDriver({ binding: globalThis.STORAGE }),
});

// Using from Durable Objects and Workers using Modules Syntax
const storage = createStorage({
  driver: cloudflareKVBindingDriver({ binding: this.env.STORAGE }),
});

// Using outside of Cloudflare Workers (like Node.js)
// Use cloudflare-kv-http
```

**Options:**

- `binding`: KV binding or name of namespace. Default is `STORAGE`.
- `base`: Adds prefix to all stored keys

## Using Cloudlflare KV Options

You can pass options to cloudflare such as metadata and expiration as the 3rd argument of the `setItem` function.
Refer to the [cloudflare KV docs](https://developers.cloudflare.com/workers/runtime-apis/kv/#writing-key-value-pairs) for the list of supported options.

```ts
await storage.setItem("key", "value", {
  expiration: 1578435000,
  expirationTtl: 300,
  metadata: { someMetadataKey: "someMetadataValue" },
});
```
