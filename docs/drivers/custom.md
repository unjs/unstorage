# Making custom drivers

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
