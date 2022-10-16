# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## v0.6.0

[compare changes](https://github.com/unjs/unstorage/compare/v0.2.10...v0.6.0)


### 🚀 Enhancements

  - **pkg:** ⚠️  Update depenencies and use explicit `cjs` extension ([477aa26](https://github.com/unjs/unstorage/commit/477aa26))
  - Create driver for Cloudflare KV store ([#30](https://github.com/unjs/unstorage/pull/30))
  - Overlay driver ([588881e](https://github.com/unjs/unstorage/commit/588881e))
  - Expose key utils `normalizeKey`, `joinKeys` and `normalizeBaseKey` ([be81fa8](https://github.com/unjs/unstorage/commit/be81fa8))
  - `github` driver ([#61](https://github.com/unjs/unstorage/pull/61))
  - `cloudflare-kv-http` driver ([#55](https://github.com/unjs/unstorage/pull/55))
  - Expose `builtinDrivers` ([be34d5e](https://github.com/unjs/unstorage/commit/be34d5e))
  - Export `BuiltinDriverName` type and kebab-case names ([f6a941c](https://github.com/unjs/unstorage/commit/f6a941c))
  - Add unwatch functions ([#82](https://github.com/unjs/unstorage/pull/82))

### 🩹 Fixes

  - **build:** Use cjs extension for drivers ([#29](https://github.com/unjs/unstorage/pull/29))
  - **prefixStorage:** Strip keys ([#34](https://github.com/unjs/unstorage/pull/34))
  - Handle mount overrides ([#45](https://github.com/unjs/unstorage/pull/45))
  - **cloudflare:** Add prefix key for cloudflare kv list operation ([#64](https://github.com/unjs/unstorage/pull/64))
  - **cloudflare:** Use `@cloudflare/workers-types` ([eeeac83](https://github.com/unjs/unstorage/commit/eeeac83))
  - Upgrade mkdist ([ad216c6](https://github.com/unjs/unstorage/commit/ad216c6))
  - Update builtinDrivers mapping ([ebf8d1b](https://github.com/unjs/unstorage/commit/ebf8d1b))
  - **redis:** Fix reference in `clear()` method ([#70](https://github.com/unjs/unstorage/pull/70))
  - **github:** Trim leading slash on `dir` prefix paths ([#74](https://github.com/unjs/unstorage/pull/74))
  - **fs:** Disallow keys containing `..` ([d628fab](https://github.com/unjs/unstorage/commit/d628fab))
  - **fs:** Disallow keys containing `..` ([a4dd2cd](https://github.com/unjs/unstorage/commit/a4dd2cd))
  - **server:** Fix typo in 405 `statusMessage` ([#84](https://github.com/unjs/unstorage/pull/84))
  - **cloudflare-kv-http:** HasItem and getItem ([#81](https://github.com/unjs/unstorage/pull/81))

### 💅 Refactors

  - Simplify types ([#57](https://github.com/unjs/unstorage/pull/57))
  - ⚠️  Rename `cloudflare-kv` to `cloudflare-kv-binding` ([e361f36](https://github.com/unjs/unstorage/commit/e361f36))

### 📖 Documentation

  - Update overlay ([#48](https://github.com/unjs/unstorage/pull/48))
  - Fix typo ([#60](https://github.com/unjs/unstorage/pull/60))
  - Fix `storageServer.handle` example ([#83](https://github.com/unjs/unstorage/pull/83))

### 📦 Build

  - ⚠️  Use `./dist` for all subpath exports ([4f2a211](https://github.com/unjs/unstorage/commit/4f2a211))

### 🏡 Chore

  - Update test ([f88bd67](https://github.com/unjs/unstorage/commit/f88bd67))
  - Temporary disable jest until migrating to mocha ([1399400](https://github.com/unjs/unstorage/commit/1399400))
  - **release:** 0.3.0 ([61a0b3c](https://github.com/unjs/unstorage/commit/61a0b3c))
  - Update dependencies ([e1fb319](https://github.com/unjs/unstorage/commit/e1fb319))
  - **release:** 0.3.1 ([50ce976](https://github.com/unjs/unstorage/commit/50ce976))
  - Update ohmyfetch ([f05ad99](https://github.com/unjs/unstorage/commit/f05ad99))
  - **release:** 0.3.2 ([fa199ba](https://github.com/unjs/unstorage/commit/fa199ba))
  - **release:** 0.3.3 ([d40f149](https://github.com/unjs/unstorage/commit/d40f149))
  - Update repo ([3b4b32d](https://github.com/unjs/unstorage/commit/3b4b32d))
  - Fix redis type import ([9985cda](https://github.com/unjs/unstorage/commit/9985cda))
  - Update toc ([5fe2e41](https://github.com/unjs/unstorage/commit/5fe2e41))
  - **release:** 0.4.0 ([20ba91d](https://github.com/unjs/unstorage/commit/20ba91d))
  - Fix lint issue ([e7a259c](https://github.com/unjs/unstorage/commit/e7a259c))
  - **release:** 0.4.1 ([0da9595](https://github.com/unjs/unstorage/commit/0da9595))
  - **release:** 0.5.0 ([9cc61ac](https://github.com/unjs/unstorage/commit/9cc61ac))
  - **release:** 0.5.1 ([324955d](https://github.com/unjs/unstorage/commit/324955d))
  - **release:** 0.5.2 ([e7f3664](https://github.com/unjs/unstorage/commit/e7f3664))
  - **release:** 0.5.3 ([5188fec](https://github.com/unjs/unstorage/commit/5188fec))
  - **release:** 0.5.4 ([f5efe4a](https://github.com/unjs/unstorage/commit/f5efe4a))
  - **release:** 0.5.5 ([03619f4](https://github.com/unjs/unstorage/commit/03619f4))
  - **release:** 0.5.6 ([6ad10d2](https://github.com/unjs/unstorage/commit/6ad10d2))
  - **release:** 0.2.10 ([28ea3da](https://github.com/unjs/unstorage/commit/28ea3da))
  - Update h3 to 0.8.0 and other dependencies to latest ([7ffb38f](https://github.com/unjs/unstorage/commit/7ffb38f))
  - Fix ci ([b3a249f](https://github.com/unjs/unstorage/commit/b3a249f))
  - Ignore local test files ([38ae640](https://github.com/unjs/unstorage/commit/38ae640))
  - Swtich to changelogen ([e6234c4](https://github.com/unjs/unstorage/commit/e6234c4))

### ✅ Tests

  - Update kv-binding test ([ebddeb1](https://github.com/unjs/unstorage/commit/ebddeb1))
  - Choose random ports for tests ([#72](https://github.com/unjs/unstorage/pull/72))

#### ⚠️  Breaking Changes

  - **pkg:** ⚠️  Update depenencies and use explicit `cjs` extension ([477aa26](https://github.com/unjs/unstorage/commit/477aa26))
  - ⚠️  Rename `cloudflare-kv` to `cloudflare-kv-binding` ([e361f36](https://github.com/unjs/unstorage/commit/e361f36))
  - ⚠️  Use `./dist` for all subpath exports ([4f2a211](https://github.com/unjs/unstorage/commit/4f2a211))

### ❤️  Contributors

- Ahad Birang
- Alexander Lichter
- Clément Ollivier
- Corey Psoinos
- Cyrus Collier
- Daniel Roe
- Jan Wystub
- Markthree
- Pooya Parsa
- Qin Guan
- Ruben Del Rio
- Sacha STAFYNIAK
- Sébastien Chopin

### [0.5.6](https://github.com/unjs/unstorage/compare/v0.5.5...v0.5.6) (2022-08-01)


### Bug Fixes

* **fs:** disallow keys containing `..` ([d628fab](https://github.com/unjs/unstorage/commit/d628fab73b4cf83758f08817b275a223725714ab))

### [0.5.5](https://github.com/unjs/unstorage/compare/v0.5.4...v0.5.5) (2022-07-15)


### Bug Fixes

* **github:** trim leading slash on `dir` prefix paths ([#74](https://github.com/unjs/unstorage/issues/74)) ([3a117b7](https://github.com/unjs/unstorage/commit/3a117b7a95176c929f30cc2412815ac715bddc2a))
* **redis:** fix reference in `clear()` method ([#70](https://github.com/unjs/unstorage/issues/70)) ([7aea0ff](https://github.com/unjs/unstorage/commit/7aea0ffb74e15f50a8a7e06ecaa3e3d1b50f7af6))

### [0.5.4](https://github.com/unjs/unstorage/compare/v0.5.3...v0.5.4) (2022-06-29)


### Bug Fixes

* update builtinDrivers mapping ([ebf8d1b](https://github.com/unjs/unstorage/commit/ebf8d1b4d5853e339204b9277845de942182da51))

### [0.5.3](https://github.com/unjs/unstorage/compare/v0.5.2...v0.5.3) (2022-06-29)


### Features

* export `BuiltinDriverName` type and kebab-case names ([f6a941c](https://github.com/unjs/unstorage/commit/f6a941c59443340c1bd3101ab7f842e01abe5bcb))

### [0.5.2](https://github.com/unjs/unstorage/compare/v0.5.1...v0.5.2) (2022-06-23)


### Bug Fixes

* upgrade mkdist ([ad216c6](https://github.com/unjs/unstorage/commit/ad216c6e02dac05d7695a955672042141b688d43))

### [0.5.1](https://github.com/unjs/unstorage/compare/v0.5.0...v0.5.1) (2022-06-22)


### Bug Fixes

* **cloudflare:** add prefix key for cloudflare kv list operation ([#64](https://github.com/unjs/unstorage/issues/64)) ([ad13230](https://github.com/unjs/unstorage/commit/ad132304b372e5271c6a7e9ed1c4b2f29a7b1b67))
* **cloudflare:** use `@cloudflare/workers-types` ([eeeac83](https://github.com/unjs/unstorage/commit/eeeac838961682a6af60ffa4f732ceb4dc2e0caf))

## [0.5.0](https://github.com/unjs/unstorage/compare/v0.4.1...v0.5.0) (2022-06-13)


### ⚠ BREAKING CHANGES

* rename `cloudflare-kv` to `cloudflare-kv-binding`

### Features

* `cloudflare-kv-http` driver ([#55](https://github.com/unjs/unstorage/issues/55)) ([b2159d7](https://github.com/unjs/unstorage/commit/b2159d7afc71523d1651fc3c6dd7a730ceb55182))
* `github` driver ([#61](https://github.com/unjs/unstorage/issues/61)) ([5ddb41a](https://github.com/unjs/unstorage/commit/5ddb41ae84ef98b8100636f42c8c0e79cc1916b0))
* expose `builtinDrivers` ([be34d5e](https://github.com/unjs/unstorage/commit/be34d5e71861162321103dd57ba6767e8bad9e4d))


* rename `cloudflare-kv` to `cloudflare-kv-binding` ([e361f36](https://github.com/unjs/unstorage/commit/e361f36484325587ce2bc1fcdeac3ab602bcf1dc))

### [0.4.1](https://github.com/unjs/unstorage/compare/v0.4.0...v0.4.1) (2022-05-04)


### Features

* expose key utils `normalizeKey`, `joinKeys` and `normalizeBaseKey` ([be81fa8](https://github.com/unjs/unstorage/commit/be81fa892740d35c29c162fc2efc97924518d520))

## [0.4.0](https://github.com/unjs/unstorage/compare/v0.3.3...v0.4.0) (2022-05-02)


### ⚠ BREAKING CHANGES

* use `./dist` for all subpath exports

### Features

* overlay driver ([588881e](https://github.com/unjs/unstorage/commit/588881eb878ba3fad4ab306cf981f0b2dd9f4f9b))


### Bug Fixes

* handle mount overrides ([#45](https://github.com/unjs/unstorage/issues/45)) ([092e539](https://github.com/unjs/unstorage/commit/092e539302b1f51e109dd4756099aab71452755c))


### build

* use `./dist` for all subpath exports ([4f2a211](https://github.com/unjs/unstorage/commit/4f2a211a1497afc34c8bd19183ae065ecac3d51c))

### [0.3.3](https://github.com/unjs/unstorage/compare/v0.3.2...v0.3.3) (2021-11-18)


### Bug Fixes

* **prefixStorage:** strip keys ([#34](https://github.com/unjs/unstorage/issues/34)) ([644f1a9](https://github.com/unjs/unstorage/commit/644f1a9bd8dc1bc99568f0423e2b697502126989))

### [0.3.2](https://github.com/unjs/unstorage/compare/v0.3.1...v0.3.2) (2021-11-05)


### Features

* create driver for Cloudflare KV store ([#30](https://github.com/unjs/unstorage/issues/30)) ([5f2f677](https://github.com/unjs/unstorage/commit/5f2f677e04bbed8c83d150eaa838627da15907a5))

### [0.3.1](https://github.com/unjs/unstorage/compare/v0.3.0...v0.3.1) (2021-11-04)


### Bug Fixes

* **build:** use cjs extension for drivers ([#29](https://github.com/unjs/unstorage/issues/29)) ([e42cea2](https://github.com/unjs/unstorage/commit/e42cea28623b447a13880d26850e3be56b1df1c8))

## [0.3.0](https://github.com/unjs/unstorage/compare/v0.2.9...v0.3.0) (2021-10-22)


### ⚠ BREAKING CHANGES

* **pkg:** update depenencies and use explicit `cjs` extension

### Features

* **pkg:** update depenencies and use explicit `cjs` extension ([477aa26](https://github.com/unjs/unstorage/commit/477aa263d55cb20a3a95eaabd0bd2c30b25fe297))

### [0.2.9](https://github.com/unjs/unstorage/compare/v0.2.8...v0.2.9) (2021-10-06)


### Features

* allow driver getKey to receive base key ([#26](https://github.com/unjs/unstorage/issues/26)) ([9fd89b1](https://github.com/unjs/unstorage/commit/9fd89b1dcf6f585e6bcdcbb3cc1b87fee0e3f4dc))

### [0.2.8](https://github.com/unjs/unstorage/compare/v0.2.7...v0.2.8) (2021-09-09)


### Bug Fixes

* **prefixStorage:** handle when key is not provided ([#18](https://github.com/unjs/unstorage/issues/18)) ([3c754cb](https://github.com/unjs/unstorage/commit/3c754cbda4383655b7d39300254fbb35e043b703))

### [0.2.7](https://github.com/unjs/unstorage/compare/v0.2.6...v0.2.7) (2021-09-09)

### [0.2.6](https://github.com/unjs/unstorage/compare/v0.2.5...v0.2.6) (2021-09-08)


### Features

* namespaced storage (prefixStorage) ([d58beaa](https://github.com/unjs/unstorage/commit/d58beaa2c58439b18421c08a504b8b64edb15950))

### [0.2.5](https://github.com/unjs/unstorage/compare/v0.2.4...v0.2.5) (2021-09-08)


### Features

* support readonly drivers without `setItem`, `removeItem` and `clear` ([22de631](https://github.com/unjs/unstorage/commit/22de6311be63bcfcab8e888c3526d7b311a43d35))

### [0.2.4](https://github.com/unjs/unstorage/compare/v0.2.3...v0.2.4) (2021-09-08)


### Features

* meta support ([3a5d865](https://github.com/unjs/unstorage/commit/3a5d865b54c1e5118915fc4c37e5a6e631b0d38d)), closes [#3](https://github.com/unjs/unstorage/issues/3)


### Bug Fixes

* omit meta keys for `getKeys` ([34dec7d](https://github.com/unjs/unstorage/commit/34dec7d8de116bbf7f46ce5466198692c07242f3))

### [0.2.3](https://github.com/unjs/unstorage/compare/v0.2.2...v0.2.3) (2021-06-07)


### Bug Fixes

* **pkg:** update exports (fxes [#6](https://github.com/unjs/unstorage/issues/6)) ([5dd3f9b](https://github.com/unjs/unstorage/commit/5dd3f9bdb1dac4a7998acd5a3e15d17ab600f446))

### [0.2.2](https://github.com/unjs/unstorage/compare/v0.2.1...v0.2.2) (2021-05-24)


### Bug Fixes

* update mkdist (fixes [#5](https://github.com/unjs/unstorage/issues/5)) ([42e5437](https://github.com/unjs/unstorage/commit/42e54379b20094ef2291af5b332a2522d2bd1d73))

### [0.2.1](https://github.com/unjs/unstorage/compare/v0.2.0...v0.2.1) (2021-05-24)


### Bug Fixes

* **pkg:** use unbuild and fix drivers/* export ([251182b](https://github.com/unjs/unstorage/commit/251182ba2efd27aab8c2b117c58bf3f9318608ba))

## [0.2.0](https://github.com/unjs/unstorage/compare/v0.1.6...v0.2.0) (2021-05-24)


### ⚠ BREAKING CHANGES

* update dependencies and use mjs for drivers build

### Bug Fixes

* **http:** use isolated utils ([fc4b23b](https://github.com/unjs/unstorage/commit/fc4b23bb0166e03f3d32260cddc4eff7b1655a00))


* update dependencies and use mjs for drivers build ([e7a6c27](https://github.com/unjs/unstorage/commit/e7a6c276a4c2c1b905f2d64438f12a4dc7421a6c))

### [0.1.6](https://github.com/unjs/unstorage/compare/v0.1.5...v0.1.6) (2021-05-24)


### Bug Fixes

* fallback value for readdir ([ea7d73b](https://github.com/unjs/unstorage/commit/ea7d73bd786e278ff1f49e7555c6e7bd7d690908))

### [0.1.5](https://github.com/unjs/unstorage/compare/v0.1.4...v0.1.5) (2021-04-16)


### Bug Fixes

* **fs:** race condition for ensuredir ([437cc76](https://github.com/unjs/unstorage/commit/437cc76824fea7121107aaa45a17bd47155a6201))

### [0.1.4](https://github.com/unjs/unstorage/compare/v0.1.3...v0.1.4) (2021-04-14)

### [0.1.3](https://github.com/unjs/unstorage/compare/v0.1.2...v0.1.3) (2021-04-14)


### Features

* redis driver ([7562af2](https://github.com/unjs/unstorage/commit/7562af24795594653c8a5e590131e7d0398be83e))

### [0.1.2](https://github.com/unjs/unstorage/compare/v0.1.1...v0.1.2) (2021-03-24)


### Bug Fixes

* **fs-drivers:** typo in error message ([0e7e063](https://github.com/unjs/unstorage/commit/0e7e0631bee635032d35b0a39228981a2891cee4))
* **pkg:** avoid extra index build ([5233de6](https://github.com/unjs/unstorage/commit/5233de6545615c5c513b658343169b5c11d1ceb5))

### [0.1.1](https://github.com/unjs/unstorage/compare/v0.1.0...v0.1.1) (2021-03-13)


### Bug Fixes

* move defineDriver to driver/utils ([6ddaceb](https://github.com/unjs/unstorage/commit/6ddaceb3d08c50a5f7d3c7f0d58455422ec7d490))

## [0.1.0](https://github.com/unjs/unstorage/compare/v0.0.4...v0.1.0) (2021-03-13)


### ⚠ BREAKING CHANGES

* restoreSnapshot
* simplify mount usage

### Features

* allow passing default driver to factory fn ([bbca3c3](https://github.com/unjs/unstorage/commit/bbca3c3ca031a5193b89d2dedc63e6b22c15a431))
* restoreSnapshot ([6e75a61](https://github.com/unjs/unstorage/commit/6e75a615c85a79bc98eb0c839fbd2ae8fedac535))
* simplify mount usage ([3eccf84](https://github.com/unjs/unstorage/commit/3eccf8471154a4cac4c2c9e006e5fa2d3607ed5b))


### Bug Fixes

* **pkg:** fix exports ([a846fc0](https://github.com/unjs/unstorage/commit/a846fc0d9bc1ae034c893d168c177fc066c26711))

### [0.0.4](https://github.com/unjs/unstorage/compare/v0.0.3...v0.0.4) (2021-03-12)


### Bug Fixes

* **http:** getKeys await ([59b87c5](https://github.com/unjs/unstorage/commit/59b87c53f24413a3fce7843f9ff73d05f77c8139))

### [0.0.3](https://github.com/unjs/unstorage/compare/v0.0.2...v0.0.3) (2021-03-11)


### Features

* unstorage command for standalone server ([171eb37](https://github.com/unjs/unstorage/commit/171eb37cdda061b24870c1a799a618e5b87126ad))
* **server:** returns keys on get if val not found ([79fd997](https://github.com/unjs/unstorage/commit/79fd997e59c27df78cc4db9e156052d16f764c95))
* support more http methods ([45d4771](https://github.com/unjs/unstorage/commit/45d47711c67dd73d1da4acfc56ebb5951cb2d387))
* support storage server ([5240591](https://github.com/unjs/unstorage/commit/5240591ea83df43a83d90c134d1a9cf47d0d6784))


### Bug Fixes

* handle mountpoints qurty shorter than mountpoint ([9cc1904](https://github.com/unjs/unstorage/commit/9cc1904c0d68a1d319a850f743cd2d48ef573040))

### [0.0.2](https://github.com/unjs/unstorage/compare/v0.0.1...v0.0.2) (2021-03-11)


### Features

* http driver ([438db64](https://github.com/unjs/unstorage/commit/438db6427602a08343c8836a3386b9d712ca6ee9))
* support base for drivers ([6844cd1](https://github.com/unjs/unstorage/commit/6844cd11373c7aeee49780322d4c23c48342eb8a))
* watcher ([ebcf1f1](https://github.com/unjs/unstorage/commit/ebcf1f1a742756b78adaa955bdc90615554404cf))


### Bug Fixes

* add mount prefix to watch key ([0bb634d](https://github.com/unjs/unstorage/commit/0bb634dcc51de2f32f2b2b892efa9090ef2c6885))

### 0.0.1 (2021-03-11)


### Features

* data serialization ([3e96b26](https://github.com/unjs/unstorage/commit/3e96b262385f47df837dc664190b9c33e5afdd72))
* mount improvements and unmount ([7dd731b](https://github.com/unjs/unstorage/commit/7dd731b3c27675ff81cf45b2d7425268ff86d300))
* snapshot ([7052380](https://github.com/unjs/unstorage/commit/7052380cffa27fba877be575dd46aeaee3b98e3a))
* state hydration ([4253c52](https://github.com/unjs/unstorage/commit/4253c526f8d5279ff13f9364427418a0d7cfd16a))
* support base for getKeys and clear ([d278fab](https://github.com/unjs/unstorage/commit/d278fab9a43316f77a7b3ec6d67bc34089e1b34d))


### Bug Fixes

* remove mountpoint prefix ([fd6b865](https://github.com/unjs/unstorage/commit/fd6b865ac1abf7f9fa67dc8d54aef8911331e1a4))
* **fs:** safe readdir ([627cad3](https://github.com/unjs/unstorage/commit/627cad3173955b2dabd70b500f59b1f0932a043a))
