# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## v1.3.0

[compare changes](https://github.com/unjs/unstorage/compare/v1.2.0...v1.3.0)


### 🚀 Enhancements

  - **server:** Support authorize ([#175](https://github.com/unjs/unstorage/pull/175))
  - **server:** Support `resolvePath` ([4717851](https://github.com/unjs/unstorage/commit/4717851))

### 🩹 Fixes

  - **redis:** Remove strict options validation ([9294121](https://github.com/unjs/unstorage/commit/9294121))
  - **redis:** Respect both global and operation options for `ttl` ([a491333](https://github.com/unjs/unstorage/commit/a491333))
  - **pkg:** Move `types` field to the first ([f2b08f6](https://github.com/unjs/unstorage/commit/f2b08f6))
  - **pkg:** Export compat types for `/server` subpath ([3cc2c48](https://github.com/unjs/unstorage/commit/3cc2c48))

### 📖 Documentation

  - Update snapshots page ([4619326](https://github.com/unjs/unstorage/commit/4619326))
  - Improvements on http server ([a4b8fb8](https://github.com/unjs/unstorage/commit/a4b8fb8))

### 🏡 Chore

  - **docs:** Lintfix ([45c0b38](https://github.com/unjs/unstorage/commit/45c0b38))
  - Update badge styles ([ecf0d74](https://github.com/unjs/unstorage/commit/ecf0d74))
  - **readme:** Small improvements ([790d762](https://github.com/unjs/unstorage/commit/790d762))
  - **readme:** Add license badge ([9f1d3aa](https://github.com/unjs/unstorage/commit/9f1d3aa))

### ❤️  Contributors

- Pooya Parsa ([@pi0](http://github.com/pi0))
- Sébastien Chopin ([@Atinux](http://github.com/Atinux))

## v1.2.0

[compare changes](https://github.com/unjs/unstorage/compare/v1.1.5...v1.2.0)


### 🚀 Enhancements

  - `mongodb` driver ([#155](https://github.com/unjs/unstorage/pull/155))
  - `azure-storage-blob` driver ([#154](https://github.com/unjs/unstorage/pull/154))
  - `azure-cosmos` driver ([#158](https://github.com/unjs/unstorage/pull/158))
  - `azure-key-vault` driver ([#159](https://github.com/unjs/unstorage/pull/159))
  - `azure-app-configuration` driver ([#156](https://github.com/unjs/unstorage/pull/156))
  - `azure-storage-table` ([#148](https://github.com/unjs/unstorage/pull/148))
  - `getMount` and `getMounts` utils ([#167](https://github.com/unjs/unstorage/pull/167))
  - Allow passing transaction options to drivers ([#168](https://github.com/unjs/unstorage/pull/168))
  - **redis:** Support native `ttl` ([#169](https://github.com/unjs/unstorage/pull/169))
  - `http` and server improvements ([#170](https://github.com/unjs/unstorage/pull/170))

### 🩹 Fixes

  - **redis:** Fix clear method ([#163](https://github.com/unjs/unstorage/pull/163))

### 💅 Refactors

  - **redis:** Driver improvements ([#160](https://github.com/unjs/unstorage/pull/160))

### 📖 Documentation

  - Start splitting docs ([6bca2a8](https://github.com/unjs/unstorage/commit/6bca2a8))
  - Add docs website ([#166](https://github.com/unjs/unstorage/pull/166))

### 🏡 Chore

  - Remove unused dependencies ([#153](https://github.com/unjs/unstorage/pull/153))
  - Add vercel.json ([10d2610](https://github.com/unjs/unstorage/commit/10d2610))

### ✅ Tests

  - Add unit test for redis driver ([#164](https://github.com/unjs/unstorage/pull/164))

### ❤️  Contributors

- Pooya Parsa ([@pi0](http://github.com/pi0))
- Sébastien Chopin <seb@nuxtjs.com>
- Jan-Henrik Damaschke <jdamaschke@outlook.de>
- Jamwong-ecosa <jamwong@ecosa.com.hk>
- Daniel Roe <daniel@roe.dev>

## v1.1.5

[compare changes](https://github.com/unjs/unstorage/compare/v1.1.4...v1.1.5)


### 🏡 Chore

  - Update h3 dependency ([1e2b822](https://github.com/unjs/unstorage/commit/1e2b822))

### ❤️  Contributors

- Pooya Parsa <pooya@pi0.io>

## v1.1.4

[compare changes](https://github.com/unjs/unstorage/compare/v1.1.3...v1.1.4)


### 🩹 Fixes

  - Strip query param from keys ([cc3ebb7](https://github.com/unjs/unstorage/commit/cc3ebb7))

### ❤️  Contributors

- Pooya Parsa <pooya@pi0.io>

## v1.1.3

[compare changes](https://github.com/unjs/unstorage/compare/v1.1.2...v1.1.3)


### 🩹 Fixes

  - Allow stringify array ([#147](https://github.com/unjs/unstorage/pull/147))

### ❤️  Contributors

- Yasser Lahbibi <yasser.lahbibi@apenhet.com>

## v1.1.2

[compare changes](https://github.com/unjs/unstorage/compare/v1.1.1...v1.1.2)


### 📦 Build

  - Update mkdist ([3839ab3](https://github.com/unjs/unstorage/commit/3839ab3))

### ❤️  Contributors

- Pooya Parsa <pooya@pi0.io>

## v1.1.1

[compare changes](https://github.com/unjs/unstorage/compare/v1.1.0...v1.1.1)


### 📦 Build

  - Fix output drivers to top level drivers ([ff3959c](https://github.com/unjs/unstorage/commit/ff3959c))

### ❤️  Contributors

- Pooya Parsa <pooya@pi0.io>

## v1.1.0

[compare changes](https://github.com/unjs/unstorage/compare/v1.0.1...v1.1.0)


### 🚀 Enhancements

  - Serialize values implementing `toJSON()` ([#139](https://github.com/unjs/unstorage/pull/139))
  - Experimental raw data support ([#141](https://github.com/unjs/unstorage/pull/141))
  - **driver:** Add planetscale driver ([#140](https://github.com/unjs/unstorage/pull/140))
  - **fs:** Support `readOnly` and `noClear` options ([f2dddbd](https://github.com/unjs/unstorage/commit/f2dddbd))
  - **fs:** Support `birthtime` and `ctime` meta ([#136](https://github.com/unjs/unstorage/pull/136))
  - `lru-cache` driver ([#146](https://github.com/unjs/unstorage/pull/146))

### 🩹 Fixes

  - **cloudflare:** Pass params to kv request ([#138](https://github.com/unjs/unstorage/pull/138))
  - **planetscale:** Use `birthtime` for `created_at` value ([#144](https://github.com/unjs/unstorage/pull/144))
  - Update driver defenition types ([#143](https://github.com/unjs/unstorage/pull/143))

### 💅 Refactors

  - Use type import for node builtin ([#133](https://github.com/unjs/unstorage/pull/133))

### 📖 Documentation

  - Fix readme typo ([#134](https://github.com/unjs/unstorage/pull/134))
  - Add experimental link for raw support ([98a6466](https://github.com/unjs/unstorage/commit/98a6466))

### 📦 Build

  - Provide backwards-compatible type entries ([#132](https://github.com/unjs/unstorage/pull/132))

### 🏡 Chore

  - Update dependencies ([2cf6697](https://github.com/unjs/unstorage/commit/2cf6697))
  - Update readme ([229a0eb](https://github.com/unjs/unstorage/commit/229a0eb))
  - Update readme ([960dd43](https://github.com/unjs/unstorage/commit/960dd43))

### 🎨 Styles

  - Format and lint code ([fd4e006](https://github.com/unjs/unstorage/commit/fd4e006))
  - Format readme with prettier ([ec7c7c2](https://github.com/unjs/unstorage/commit/ec7c7c2))

### ❤️  Contributors

- Pooya Parsa <pooya@pi0.io>
- Daniel Roe <daniel@roe.dev>
- Yu Le <is.yuler@gmail.com>

### [1.0.1](https://github.com/unjs/unstorage/compare/v1.0.0...v1.0.1) (2022-11-15)

## [1.0.0](https://github.com/unjs/unstorage/compare/v0.6.0...v1.0.0) (2022-11-15)

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
