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

Check out [storage interface](./docs/storage.md) for storage interface usage.

## Storage Utilities

Check out [storage utils](./docs/utils.md) for available extra storage utilities.

## Storage Drivers

Unstorage has several built-in storage drivers you can instantiate and mount.

Local:

- [Filesystem](./docs/drivers/node-fs.md)
- [Memory](./docs/drivers/memory.md)
- [LRU Cache](./docs/drivers/lru-cache.md)
- [Localstorage](./docs/drivers/localstorage.md)

Special:

- [HTTP](./docs/drivers/http.md)
- [Overlay](./docs/drivers/overlay.md)
- [Custom Driver](./docs/drivers/custom.md)

Database:

- [MongoDB](./docs/drivers/mongodb.md)
- [Redis](./docs/drivers/redis.md)

Providers:

- [Azure Key Vault](./docs/drivers/azure-key-vault.md)
- [Azure Cosmos](./docs//drivers/azure-cosmos.md)
- [Azure Storage Block](./docs/drivers/azure-storage-blod.md)
- [Cloudflare KV Binding](./docs/drivers/cloudflare-kv-binding.md)
- [Cloudflare KV HTTP](./docs/drivers/cloudflare-kv-http.md)
- [Github](./docs/drivers/github.md)
- [Planetscale](./docs/drivers/planetscale.md)

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
