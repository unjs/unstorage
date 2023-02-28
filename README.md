# unstorage

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Github Actions][github-actions-src]][github-actions-href]
[![Codecov][codecov-src]][codecov-href]
[![bundle][bundle-src]][bundle-href]

💾 Universal Storage Layer

Read the [documentation](https://unstorage.unjs.io).

**Why ❓**

We choose one or more data storage based on our use-cases: a filesystem, a database or LocalStorage for browsers.

It soon starts to be create troubles for supporting and combining more than one or switching between them. For JavaScript library authors, this usually means they have to decide how many platforms they support and implement storage for each.

Comparing to similar solutions like [localforage](https://localforage.github.io/localForage/), unstorage core is almost 6x smaller (`28.9kB` vs `4.7kB`). It uses modern ESM/Typescript/Async syntax and more features to be used universally.

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

Check out [storage interface](https://unstorage.unjs.io/usage) for storage interface usage.

## Storage Utilities

Check out [storage utils](https://unstorage.unjs.io/utils) for available extra storage utilities.

## Storage Drivers

Unstorage has several built-in storage drivers you can instantiate and mount.

Local:

- [Filesystem](https://unstorage.unjs.io/driver/fs)
- [Memory](https://unstorage.unjs.io/driver/memory)
- [LRU Cache](https://unstorage.unjs.io/driver/lru-cache)
- [Localstorage](https://unstorage.unjs.io/driver/localstorage)

Special:

- [HTTP](https://unstorage.unjs.io/driver/http)
- [Overlay](https://unstorage.unjs.io/driver/overlay)
- [Custom Driver](https://unstorage.unjs.io/custom-driver)

Database:

- [MongoDB](https://unstorage.unjs.io/driver/mongodb)
- [Redis](https://unstorage.unjs.io/driver/redis)

Providers:

- [Azure App Configuration](https://unstorage.unjs.io/drivers/azure-app-configuration)
- [Azure Key Vault](https://unstorage.unjs.io/drivers/azure-key-vault)
- [Azure Cosmos](https://unstorage.unjs.io/drivers/azure-cosmos)
- [Azure Storage Block](https://unstorage.unjs.io/drivers/azure-storage-blod)
- [Azure Storage Table](https://unstorage.unjs.io/drivers//azure-storage-table)
- [Cloudflare KV Binding](https://unstorage.unjs.io/drivers/cloudflare-kv-binding)
- [Cloudflare KV HTTP](https://unstorage.unjs.io/drivers/cloudflare-kv-http)
- [Github](https://unstorage.unjs.io/drivers/github)
- [Planetscale](https://unstorage.unjs.io/drivers/planetscale)

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
