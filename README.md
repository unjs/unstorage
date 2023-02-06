# unstorage

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Github Actions][github-actions-src]][github-actions-href]
[![Codecov][codecov-src]][codecov-href]
[![bundle][bundle-src]][bundle-href]

> 💾 Universal Storage Layer

**Why ❓**

Typically, we choose one or more data storages based on our use-cases like a filesystem, a database like Redis, Mongo, or LocalStorage for browsers but it will soon start to be lots of trouble for supporting and combining more than one or switching between them. For javascript library authors, this usually means they have to decide how many platforms they support and implement storage for each.

💡 Unstorage solution is a unified and powerful Key-Value (KV) interface that allows combining drivers that are either built-in or can be implemented via a super simple interface and adding conventional features like mounting, watching, and working with metadata.

Comparing to similar solutions like [localforage](https://localforage.github.io/localForage/), unstorage core is almost 6x smaller (28.9 kB vs 4.7 kB), using modern ESM/Typescript/Async syntax and many more features to be used universally.

<br>
✅ Designed to work in all environments (Browser, NodeJS, and Workers) <br>
✅ Multiple built-in drivers (Memory, FS, LocalStorage, HTTP, Redis) <br>
✅ Asynchronous API <br>
✅ Unix-style driver mounting to combine storages<br>
✅ Default in-memory storage <br>
✅ Tree-shakable utils and tiny core <br>
✅ Driver native and user provided metadata <br>
✅ Native aware value serialization and deserialization <br>
✅ Restore initial state (hydration) <br>
✅ State snapshot <br>
✅ Driver agnostic watcher <br>
✅ HTTP Storage server (cli and programmatic) <br>
✅ Namespaced storage <br>
✅ Overlay storage (copy-on-write) <br>
✅ Binary and raw operations support (experimental) <br>
<br>

## Usage

Install `unstorage` npm package:

```sh
# yarn
yarn add unstorage
# npm
npm install unstorage
# pnpm
pnpm add unstorage

```

```js
import { createStorage } from "unstorage";

const storage = createStorage(/* opts */);

await storage.getItem("foo:bar"); // or storage.getItem('/foo/bar')
```

**Options:**

- `driver`: Default driver (using memory if not provided)

## Storage Interface

### `storage.hasItem(key)`

Checks if storage contains a key. Resolves to either `true` or `false`.

```js
await storage.hasItem("foo:bar");
```

### `storage.getItem(key)`

Gets the value of a key in storage. Resolves to either a javascript primitive value or `undefined`.

```js
await storage.getItem("foo:bar");
```

### `storage.getItemRaw(key)`

**Note:** This is an experimental feature. Please check [unjs/unstorage#142](https://github.com/unjs/unstorage/issues/142) for more information.

Gets the value of a key in storage in raw format.

```js
// Value can be a Buffer, Array or Driver's raw format
const value = await storage.getItemRaw("foo:bar.bin");
```

### `storage.setItem(key, value)`

Add/Update a value to the storage.

If the value is not a string, it will be stringified.

If value is `undefined`, it is same as calling `removeItem(key)`.

```js
await storage.setItem("foo:bar", "baz");
```

### `storage.setItemRaw(key, value)`

**Note:** This is an experimental feature. Please check [unjs/unstorage#142](https://github.com/unjs/unstorage/issues/142) for more information.

Add/Update a value to the storage in raw format.

If value is `undefined`, it is same as calling `removeItem(key)`.

```js
await storage.setItemRaw("data/test.bin", new Uint8Array([1, 2, 3]));
```

### `storage.removeItem(key, removeMeta = true)`

Remove a value (and it's meta) from storage.

```js
await storage.removeItem("foo:bar");
```

### `storage.getMeta(key, nativeOnly?)`

Get metadata object for a specific key.

This data is fetched from two sources:

- Driver native meta (like file creation time)
- Custom meta set by `storage.setMeta` (overrides driver native meta)

```js
await storage.getMeta("foo:bar"); // For fs driver returns an object like { mtime, atime, size }
```

### `storage.setMeta(key)`

Set custom meta for a specific key by adding a `$` suffix.

```js
await storage.setMeta("foo:bar", { flag: 1 });
// Same as storage.setItem('foo:bar$', { flag: 1 })
```

### `storage.removeMeta(key)`

Remove meta for a specific key by adding a `$` suffix.

```js
await storage.removeMeta("foo:bar");
// Same as storage.removeItem('foo:bar$')
```

### `storage.getKeys(base?)`

Get all keys. Returns an array of strings.

Meta keys (ending with `$`) will be filtered.

If a base is provided, only keys starting with the base will be returned also only mounts starting with base will be queried. Keys still have a full path.

```js
await storage.getKeys();
```

### `storage.clear(base?)`

Removes all stored key/values. If a base is provided, only mounts matching base will be cleared.

```js
await storage.clear();
```

### `storage.dispose()`

Disposes all mounted storages to ensure there are no open-handles left. Call it before exiting process.

**Note:** Dispose also clears in-memory data.

```js
await storage.dispose();
```

### `storage.mount(mountpoint, driver)`

By default, everything is stored in memory. We can mount additional storage space in a Unix-like fashion.

When operating with a `key` that starts with mountpoint, instead of default storage, mounted driver will be called.

In addition to `base`, you can set `readOnly` and `noClear` to disable write and clear operations.

```js
import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";

// Create a storage container with default memory storage
const storage = createStorage({});

storage.mount("/output", fsDriver({ base: "./output" }));

//  Writes to ./output/test file
await storage.setItem("/output/test", "works");

// Adds value to in-memory storage
await storage.setItem("/foo", "bar");
```

### `storage.unmount(mountpoint, dispose = true)`

Unregisters a mountpoint. Has no effect if mountpoint is not found or is root.

```js
await storage.unmount("/output");
```

### `storage.watch(callback)`

Starts watching on all mountpoints. If driver does not supports watching, only emits even when `storage.*` methods are called.

```js
const unwatch = await storage.watch((event, key) => {});
// to stop this watcher
await unwatch();
```

### `storage.unwatch()`

Stop all watchers on all mountpoints.

```js
await storage.unwatch();
```

## Utils

### `snapshot(storage, base?)`

Snapshot from all keys in specified base into a plain javascript object (string: string). Base is removed from keys.

```js
import { snapshot } from "unstorage";

const data = await snapshot(storage, "/etc");
```

### `restoreSnapshot(storage, data, base?)`

Restore snapshot created by `snapshot()`.

```js
await restoreSnapshot(storage, { "foo:bar": "baz" }, "/etc2");
```

### `prefixStorage(storage, data, base?)`

Create a namespaced instance of main storage.

All operations are virtually prefixed. Useful to create shorcuts and limit access.

```js
import { createStorage, prefixStorage } from "unstorage";

const storage = createStorage();
const assetsStorage = prefixStorage(storage, "assets");

// Same as storage.setItem('assets:x', 'hello!')
await assetsStorage.setItem("x", "hello!");
```

## Storage Server

We can easily expose unstorage instance to an http server to allow remote connections.
Request url is mapped to key and method/body mapped to function. See below for supported http methods.

**🛡️ Security Note:** Server is unprotected by default. You need to add your own authentication/security middleware like basic authentication.
Also consider that even with authentication, unstorage should not be exposed to untrusted users since it has no protection for abuse (DDOS, Filesystem escalation, etc)

**Programmatic usage:**

```js
import { listen } from "listhen";
import { createStorage } from "unstorage";
import { createStorageServer } from "unstorage/server";

const storage = createStorage();
const storageServer = createStorageServer(storage);

// Alternatively we can use `storageServer.handle` as a middleware
await listen(storageServer.handle);
```

**Using CLI:**

```sh
npx unstorage .
```

**Supported HTTP Methods:**

- `GET`: Maps to `storage.getItem`. Returns list of keys on path if value not found.
- `HEAD`: Maps to `storage.hasItem`. Returns 404 if not found.
- `PUT`: Maps to `storage.setItem`. Value is read from body and returns `OK` if operation succeeded.
- `DELETE`: Maps to `storage.removeItem`. Returns `OK` if operation succeeded.

## Drivers

### `fs` (node)

Maps data to the real filesystem using directory structure for nested keys. Supports watching using [chokidar](https://github.com/paulmillr/chokidar).

This driver implements meta for each key including `mtime` (last modified time), `atime` (last access time), and `size` (file size) using `fs.stat`.

```js
import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";

const storage = createStorage({
  driver: fsDriver({ base: "./tmp" }),
});
```

**Options:**

- `base`: Base directory to isolate operations on this directory
- `ignore`: Ignore patterns for watch <!-- and key listing -->
- `watchOptions`: Additional [chokidar](https://github.com/paulmillr/chokidar) options.

### `localStorage` (browser)

Store data in [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

```js
import { createStorage } from "unstorage";
import localStorageDriver from "unstorage/drivers/localstorage";

const storage = createStorage({
  driver: localStorageDriver({ base: "app:" }),
});
```

**Options:**

- `base`: Add `${base}:` to all keys to avoid collision
- `localStorage`: Optionally provide `localStorage` object
- `window`: Optionally provide `window` object

### `memory` (universal)

Keeps data in memory using [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set).

By default it is mounted to top level so it is unlikely you need to mount it again.

```js
import { createStorage } from "unstorage";
import memoryDriver from "unstorage/drivers/memory";

const storage = createStorage({
  driver: memoryDriver(),
});
```

### `lru-cache` (universal)

Keeps cached data in memory using [LRU Cache](https://www.npmjs.com/package/lru-cache).

See [`lru-cache`](https://www.npmjs.com/package/lru-cache) for supported options. By default `{ maxSize: 500 }` is used.

```js
import { createStorage } from "unstorage";
import lruCacheDriver from "unstorage/drivers/lru-cache";

const storage = createStorage({
  driver: lruCacheDriver(),
});
```

### `overlay` (universal)

This is a special driver that creates a multi-layer overlay driver.

All write operations happen on the top level layer while values are read from all layers.

When removing a key, a special value `__OVERLAY_REMOVED__` will be set on the top level layer internally.

In the example below, we create an in-memory overlay on top of fs. No changes will be actually written to the disk.

```js
import { createStorage } from "unstorage";
import overlay from "unstorage/drivers/overlay";
import memory from "unstorage/drivers/memory";
import fs from "unstorage/drivers/fs";

const storage = createStorage({
  driver: overlay({
    layers: [memory(), fs({ base: "./data" })],
  }),
});
```

### `http` (universal)

Use a remote HTTP/HTTPS endpoint as data storage. Supports built-in [http server](#storage-server) methods.

This driver implements meta for each key including `mtime` (last modified time) and `status` from HTTP headers by making a `HEAD` request.

```js
import { createStorage } from "unstorage";
import httpDriver from "unstorage/drivers/http";

const storage = createStorage({
  driver: httpDriver({ base: "http://cdn.com" }),
});
```

**Options:**

- `base`: Base URL for urls

**Supported HTTP Methods:**

- `getItem`: Maps to http `GET`. Returns deserialized value if response is ok
- `hasItem`: Maps to http `HEAD`. Returns `true` if response is ok (200)
- `setItem`: Maps to http `PUT`. Sends serialized value using body
- `removeItem`: Maps to `DELETE`
- `clear`: Not supported

### `redis`

Store data in a redis storage using [ioredis](https://github.com/luin/ioredis).

```js
import { createStorage } from "unstorage";
import redisDriver from "unstorage/drivers/redis";

const storage = createStorage({
  driver: redisDriver({
    base: "storage:",
  }),
});
```

**Options:**

- `base`: Prefix all keys with base
- `url`: (optional) connection string

See [ioredis](https://github.com/luin/ioredis/blob/master/API.md#new-redisport-host-options) for all available options.

`lazyConnect` option is enabled by default so that connection happens on first redis operation.

### `cloudflare-kv-http`

Store data in [Cloudflare KV](https://developers.cloudflare.com/workers/learning/how-kv-works/) using the [Cloudflare API v4](https://api.cloudflare.com/).

You need to create a KV namespace. See [KV Bindings](https://developers.cloudflare.com/workers/runtime-apis/kv#kv-bindings) for more information.

**Note:** This driver uses native fetch and works universally! For using directly in a cloudflare worker environemnt, please use `cloudflare-kv-binding` driver for best performance!

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

### `cloudflare-kv-binding`

Store data in [Cloudflare KV](https://developers.cloudflare.com/workers/runtime-apis/kv) and access from worker bindings.

**Note:** This driver only works in a cloudflare worker environment! Use `cloudflare-kv-http` for other environments.

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
// Use cloudflare-kv-http!
```

**Options:**

- `binding`: KV binding or name of namespace. Default is `STORAGE`.

### `github`

Map files from a remote github repository. (readonly)

This driver fetches all possible keys once and keep it in cache for 10 minutes. Because of github rate limit, it is highly recommanded to provide a token. It only applies to fetching keys.

```js
import { createStorage } from "unstorage";
import githubDriver from "unstorage/drivers/github";

const storage = createStorage({
  driver: githubDriver({
    repo: "nuxt/framework",
    branch: "main",
    dir: "/docs/content",
  }),
});
```

**Options:**

- **`repo`**: Github repository. Format is `username/repo` or `org/repo`. (Required!)
- **`token`**: Github API token. (Recommended!)
- `branch`: Target branch. Default is `main`
- `dir`: Use a directory as driver root.
- `ttl`: Filenames cache revalidate time. Default is `600` seconds (10 minutes)
- `apiURL`: Github API domain. Default is `https://api.github.com`
- `cdnURL`: Github RAW CDN Url. Default is `https://raw.githubusercontent.com`

### planetscale

Stores data in [Planetscale](https://planetscale.com/)

This driver stores KV information in a Planetscale DB with columns of `id`, `value`, `created_at` and `updated_at`.

To use, you will need to install `@planetscale/database` in your project:

```json
{
  "dependencies": {
    "@planetscale/database": "^1.5.0"
  }
}
```

Then you can create a table to store your data by running the following query in your Planetscale database, where <storage> is the name of the table you want to use:

```sql
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
- `storage`: The name of the table to read from. It defaults to `storage`.
- `boostCache`: Whether to enable cached queries: see [docs](https://planetscale.com/docs/concepts/query-caching-with-planetscale-boost#using-cached-queries-in-your-application).

## Making custom drivers

It is possible to extend unstorage by creating custom drives.

- Keys are always normalized in `foo:bar` convention
- Mount base is removed
- Returning promise or direct value is optional
- You should cleanup any open watcher and handlers in `dispose`
- Value returned by `getItem` can be a serializable object or string
- Having `watch` method, disables default handler for mountpoint. You are responsible to emit event on `getItem`, `setItem` and `removeItem`.

See [src/drivers](./src/drivers) to inspire how to implement them. Methods can

**Example:**

```js
import { createStorage, defineDriver } from "unstorage";

const myStorageDriver = defineDriver((_opts) => {
  return {
    async hasItem(key) {},
    async getItem(key) {},
    async setItem(key, value) {},
    async removeItem(key) {},
    async getKeys() {},
    async clear() {},
    async dispose() {},
    // async watch(callback) {}
  };
});

const storage = createStorage({
  driver: myStorageDriver(),
});
```

## Contribution

- Clone repository
- Install dependencies with `pnpm install`
- Use `pnpm dev` to start jest watcher verifying changes
- Use `pnpm test` before pushing to ensure all tests and lint checks passing

## License

[MIT](./LICENSE)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/unstorage?style=flat-square
[npm-version-href]: https://npmjs.com/package/unstorage
[npm-downloads-src]: https://img.shields.io/npm/dm/unstorage?style=flat-square
[npm-downloads-href]: https://npmjs.com/package/unstorage
[github-actions-src]: https://img.shields.io/github/workflow/status/unjs/unstorage/ci/main?style=flat-square
[github-actions-href]: https://github.com/unjs/unstorage/actions?query=workflow%3Aci
[codecov-src]: https://img.shields.io/codecov/c/gh/unjs/unstorage/main?style=flat-square
[codecov-href]: https://codecov.io/gh/unjs/unstorage
[bundle-src]: https://img.shields.io/bundlephobia/minzip/unstorage?style=flat-square
[bundle-href]: https://bundlephobia.com/result?p=unstorage
