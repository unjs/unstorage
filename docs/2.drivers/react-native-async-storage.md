---
icon: simple-icons:react
---

# React Native AsyncStorage

Use [React Native AsyncStorage](https://github.com/react-native-async-storage/async-storage) as an Unstorage driver.

## Usage

```ts
import asyncStorageDriver from "unstorage/drivers/react-native-async-storage";

const storage = createStorage({
  driver: asyncStorageDriver({
    base: "app",
  }),
});
```

Install the peer dependency with `:pm-install{name="@react-native-async-storage/async-storage"}`.

## Options

- `base`: Optional namespace prefix for stored keys.
- `lib`: Optional AsyncStorage module (or loader) for bundlers and dependency injection.

AsyncStorage does not provide change notifications, so this driver does not support `watch`.
