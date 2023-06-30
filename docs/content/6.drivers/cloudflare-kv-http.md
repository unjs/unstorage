# Cloudflare KV (http)

Store data in [Cloudflare KV](https://developers.cloudflare.com/workers/learning/how-kv-works/) using the [Cloudflare API v4](https://api.cloudflare.com/).

You need to create a KV namespace. See [KV Bindings](https://developers.cloudflare.com/workers/runtime-apis/kv#kv-bindings) for more information.

**Note:** This driver uses native fetch and works universally! For using directly in a cloudflare worker environment, please use `cloudflare-kv-binding` driver for best performance!

```js
import { createStorage } from "unstorage";
import cloudflareKVHTTPDriver from "unstorage/drivers/cloudflare-kv-http";

// Using `apiToken`
const storage = createStorage({
  driver: cloudflareKVHTTPDriver({
    accountId: "my-account-id",
    namespaceId: "my-kv-namespace-id",
    apiToken: "supersecret-api-token",
  }),
});

// Using `email` and `apiKey`
const storage = createStorage({
  driver: cloudflareKVHTTPDriver({
    accountId: "my-account-id",
    namespaceId: "my-kv-namespace-id",
    email: "me@example.com",
    apiKey: "my-api-key",
  }),
});

// Using `userServiceKey`
const storage = createStorage({
  driver: cloudflareKVHTTPDriver({
    accountId: "my-account-id",
    namespaceId: "my-kv-namespace-id",
    userServiceKey: "v1.0-my-service-key",
  }),
});
```

**Options:**

- `accountId`: Cloudflare account ID.
- `namespaceId`: The ID of the KV namespace to target. **Note:** be sure to use the namespace's ID, and not the name or binding used in a worker environment.
- `apiToken`: API Token generated from the [User Profile 'API Tokens' page](https://dash.cloudflare.com/profile/api-tokens).
- `email`: Email address associated with your account. May be used along with `apiKey` to authenticate in place of `apiToken`.
- `apiKey`: API key generated on the "My Account" page of the Cloudflare console. May be used along with `email` to authenticate in place of `apiToken`.
- `userServiceKey`: A special Cloudflare API key good for a restricted set of endpoints. Always begins with "v1.0-", may vary in length. May be used to authenticate in place of `apiToken` or `apiKey` and `email`.
- `apiURL`: Custom API URL. Default is `https://api.cloudflare.com`.

**Supported methods:**

- `getItem`: Maps to [Read key-value pair](https://api.cloudflare.com/#workers-kv-namespace-read-key-value-pair) `GET accounts/:account_identifier/storage/kv/namespaces/:namespace_identifier/values/:key_name`
- `hasItem`: Maps to [Read key-value pair](https://api.cloudflare.com/#workers-kv-namespace-read-key-value-pair) `GET accounts/:account_identifier/storage/kv/namespaces/:namespace_identifier/values/:key_name`. Returns `true` if `<parsed response body>.success` is `true`.
- `setItem`: Maps to [Write key-value pair](https://api.cloudflare.com/#workers-kv-namespace-write-key-value-pair) `PUT accounts/:account_identifier/storage/kv/namespaces/:namespace_identifier/values/:key_name`
- `removeItem`: Maps to [Delete key-value pair](https://api.cloudflare.com/#workers-kv-namespace-delete-key-value-pair) `DELETE accounts/:account_identifier/storage/kv/namespaces/:namespace_identifier/values/:key_name`
- `getKeys`: Maps to [List a Namespace's Keys](https://api.cloudflare.com/#workers-kv-namespace-list-a-namespace-s-keys) `GET accounts/:account_identifier/storage/kv/namespaces/:namespace_identifier/keys`
- `clear`: Maps to [Delete key-value pair](https://api.cloudflare.com/#workers-kv-namespace-delete-multiple-key-value-pairs) `DELETE accounts/:account_identifier/storage/kv/namespaces/:namespace_identifier/bulk`

## Using Cloudlflare KV Options

You can pass cloudflare options such as metadata and expiration as the 3rd argument of the `setItem` function.
Refer to the [cloudflare KV API docs](https://developers.cloudflare.com/api/operations/workers-kv-namespace-write-multiple-key-value-pairs) for the list of supported options.

```ts
await storage.setItem("key", "value", {
  expiration: 1578435000,
  expiration_ttl: 300,
  base64: false,
  metadata: { someMetadataKey: "someMetadataValue" },
});
```
