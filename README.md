# unstorage

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Github Actions][github-actions-src]][github-actions-href]
[![Codecov][codecov-src]][codecov-href]
[![bundle][bundle-src]][bundle-href]

> Universal key-value Storage

![unstorage](./assets/unstorage.svg)

- Works in all environments (Browser, NodeJS and Workers)
- Asynchronous API
- Unix-style mountable paths (multi driver)
- Default in-memory storage
- Tree-shakable and lightweight core
- Native aware value serialization and deserialization
- Restore initial state (hydration)
- State snapshot
- Abstract watcher

WIP:

- Key expiration
- Storage server

**Table of Contents**
<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Drivers](#drivers)
- [Usage](#usage)
- [Storage Interface](#storage-interface)
  - [`storage.hasItem(key)`](#storagehasitemkey)
  - [`storage.getItem(key)`](#storagegetitemkey)
  - [`storage.setItem(key, value)`](#storagesetitemkey-value)
  - [`storage.setItems(base, items)`](#storagesetitemsbase-items)
  - [`storage.removeItem(key)`](#storageremoveitemkey)
  - [`storage.getKeys(base?)`](#storagegetkeysbase)
  - [`storage.clear(base?)`](#storageclearbase)
  - [`storage.dispose()`](#storagedispose)
  - [`storage.mount(mountpoint, driver, initialState?)`](#storagemountmountpoint-driver-initialstate)
  - [`storage.unmount(mountpoint, dispose = true)`](#storageunmountmountpoint-dispose--true)
  - [`storage.watch(callback)`](#storagewatchcallback)
- [Utils](#utils)
  - [`snapshot(storage, base?)`](#snapshotstorage-base)
- [Contribution](#contribution)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Drivers

- [x] Memory (Universal)
- [x] Filesystem (NodeJS)
- [x] LocalStorage (Browser)
- [ ] Cookies (Browser)
- [ ] Location params (Browser)
- [ ] HTTP (Universal)
- [ ] S3 (Universal)
- [ ] Cloudflare KV (Workers and Universal)
- [ ] Github (Universal)

## Usage

Install `unistorage` npm package:

```sh
yarn add unistorage
# or
npm i unistorage
```

```js
import { createStorage } from 'unistorage'

// Create a storage container with default memory storage
const storage = createStorage()

await storage.getItem('foo:bar')
// or
await storage.getItem('/foo/bar')
```

## Storage Interface

### `storage.hasItem(key)`

Checks if storage contains a key. Resolves to either `true` or `false`.

```js
await storage.hasItem('foo:bar')
```

### `storage.getItem(key)`

Gets value of a key in storage. Resolves to either `string` or `null`.

```js
await storage.getItem('foo:bar')
```

### `storage.setItem(key, value)`

Add Update a value to storage.

If value is not string, it will be stringified.

If value is `undefined`, it is same as calling `removeItem(key)`.

```js
await storage.setItem('foo:bar', 'baz')
```

### `storage.setItems(base, items)`

Batch update items. Internally calls one-by-one to the driver. Useful to restore/hydrate state.

```js
await storage.setItems('/', { 'foo:bar': 'baz' })
```

### `storage.removeItem(key)`

Remove a value from storage.

```js
await storage.removeItem('foo:bar')
```

### `storage.getKeys(base?)`

Get all keys. Returns an array of `string`.

If a base is provided, only keys starting with base will be returned also only mounts starting with base will be queried. Keys still have full path.

```js
await storage.getKeys()
```

### `storage.clear(base?)`

Removes all stored key/values. If a base is provided, only mounts matching base will be cleared.

```js
await storage.clear()
```

### `storage.dispose()`

Disposes all mounted storages to ensure there are no open-handles left. Call it before exiting process.

**Note:** Dispose also clears in-memory data.

```js
await storage.dispose()
```

### `storage.mount(mountpoint, driver, initialState?)`

By default, everything is stored in memory. We can mount additional storage space in a Unix-like fashion.

When operating with a `key` that starts with mountpoint, instead of default storage, mounted driver will be called.

If `initialState` argument is provided, restores/hydrates state of mountpoint using `setItems`.

<!-- TODO: Explain mountpoint hiding -->

```js
import { createStorage } from 'unistorage'
import fsDriver from 'unistorage/drivers/fs'

// Create a storage container with default memory storage
const storage = createStorage()

storage.mount('/output', fsDriver({ dir: './output' }))

//  Writes to ./output/test file
await storage.setItem('/output/test', 'works')

// Adds value to in-memory storage
await storage.setItem('/foo', 'bar')
```

### `storage.unmount(mountpoint, dispose = true)`

Unregisters a mountpoint. Has no effect if mountpoint is not found or is root.

### `storage.watch(callback)`

Starts watching on all mountpoints. If driver does not supports watching, only emits even when `storage.*` methods are called.

```js
storage.watch((event, key) => { })
```

## Utils

### `snapshot(storage, base?)`

Snapshot from all keys in specified base into a plain javascript object (string: string). Base is removed from keys.
```js
import { snapshot } from 'unstorage'

const data = await snapshot(storage, '/etc')
```
## Contribution

- Clone repository
- Install dependencies with `yarn install`
- Use `yarn dev` to start jest watcher verifying changes
- Use `yarn test` before push to ensure all tests and lint checks passing

## License

[MIT](./LICENSE)

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/unstorage?style=flat-square
[npm-version-href]: https://npmjs.com/package/unstorage

[npm-downloads-src]: https://img.shields.io/npm/dm/unstorage?style=flat-square
[npm-downloads-href]: https://npmjs.com/package/unstorage

[github-actions-src]: https://img.shields.io/github/workflow/status/unjsio/unstorage/ci/main?style=flat-square
[github-actions-href]: https://github.com/unjsio/unstorage/actions?query=workflow%3Aci

[codecov-src]: https://img.shields.io/codecov/c/gh/unjsio/unstorage/main?style=flat-square
[codecov-href]: https://codecov.io/gh/unjsio/unstorage

[bundle-src]: https://img.shields.io/bundlephobia/minzip/unstorage?style=flat-square
[bundle-href]: https://bundlephobia.com/result?p=unstorage
