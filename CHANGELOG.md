# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.1.1](https://github.com/unjsio/unstorage/compare/v0.1.0...v0.1.1) (2021-03-13)


### Bug Fixes

* move defineDriver to driver/utils ([6ddaceb](https://github.com/unjsio/unstorage/commit/6ddaceb3d08c50a5f7d3c7f0d58455422ec7d490))

## [0.1.0](https://github.com/unjsio/unstorage/compare/v0.0.4...v0.1.0) (2021-03-13)


### ⚠ BREAKING CHANGES

* restoreSnapshot
* simplify mount usage

### Features

* allow passing default driver to factory fn ([bbca3c3](https://github.com/unjsio/unstorage/commit/bbca3c3ca031a5193b89d2dedc63e6b22c15a431))
* restoreSnapshot ([6e75a61](https://github.com/unjsio/unstorage/commit/6e75a615c85a79bc98eb0c839fbd2ae8fedac535))
* simplify mount usage ([3eccf84](https://github.com/unjsio/unstorage/commit/3eccf8471154a4cac4c2c9e006e5fa2d3607ed5b))


### Bug Fixes

* **pkg:** fix exports ([a846fc0](https://github.com/unjsio/unstorage/commit/a846fc0d9bc1ae034c893d168c177fc066c26711))

### [0.0.4](https://github.com/unjsio/unstorage/compare/v0.0.3...v0.0.4) (2021-03-12)


### Bug Fixes

* **http:** getKeys await ([59b87c5](https://github.com/unjsio/unstorage/commit/59b87c53f24413a3fce7843f9ff73d05f77c8139))

### [0.0.3](https://github.com/unjsio/unstorage/compare/v0.0.2...v0.0.3) (2021-03-11)


### Features

* unstorage command for standalone server ([171eb37](https://github.com/unjsio/unstorage/commit/171eb37cdda061b24870c1a799a618e5b87126ad))
* **server:** returns keys on get if val not found ([79fd997](https://github.com/unjsio/unstorage/commit/79fd997e59c27df78cc4db9e156052d16f764c95))
* support more http methods ([45d4771](https://github.com/unjsio/unstorage/commit/45d47711c67dd73d1da4acfc56ebb5951cb2d387))
* support storage server ([5240591](https://github.com/unjsio/unstorage/commit/5240591ea83df43a83d90c134d1a9cf47d0d6784))


### Bug Fixes

* handle mountpoints qurty shorter than mountpoint ([9cc1904](https://github.com/unjsio/unstorage/commit/9cc1904c0d68a1d319a850f743cd2d48ef573040))

### [0.0.2](https://github.com/unjsio/unstorage/compare/v0.0.1...v0.0.2) (2021-03-11)


### Features

* http driver ([438db64](https://github.com/unjsio/unstorage/commit/438db6427602a08343c8836a3386b9d712ca6ee9))
* support base for drivers ([6844cd1](https://github.com/unjsio/unstorage/commit/6844cd11373c7aeee49780322d4c23c48342eb8a))
* watcher ([ebcf1f1](https://github.com/unjsio/unstorage/commit/ebcf1f1a742756b78adaa955bdc90615554404cf))


### Bug Fixes

* add mount prefix to watch key ([0bb634d](https://github.com/unjsio/unstorage/commit/0bb634dcc51de2f32f2b2b892efa9090ef2c6885))

### 0.0.1 (2021-03-11)


### Features

* data serialization ([3e96b26](https://github.com/unjsio/unstorage/commit/3e96b262385f47df837dc664190b9c33e5afdd72))
* mount improvements and unmount ([7dd731b](https://github.com/unjsio/unstorage/commit/7dd731b3c27675ff81cf45b2d7425268ff86d300))
* snapshot ([7052380](https://github.com/unjsio/unstorage/commit/7052380cffa27fba877be575dd46aeaee3b98e3a))
* state hydration ([4253c52](https://github.com/unjsio/unstorage/commit/4253c526f8d5279ff13f9364427418a0d7cfd16a))
* support base for getKeys and clear ([d278fab](https://github.com/unjsio/unstorage/commit/d278fab9a43316f77a7b3ec6d67bc34089e1b34d))


### Bug Fixes

* remove mountpoint prefix ([fd6b865](https://github.com/unjsio/unstorage/commit/fd6b865ac1abf7f9fa67dc8d54aef8911331e1a4))
* **fs:** safe readdir ([627cad3](https://github.com/unjsio/unstorage/commit/627cad3173955b2dabd70b500f59b1f0932a043a))
