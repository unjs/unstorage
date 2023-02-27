# Storage Server

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
