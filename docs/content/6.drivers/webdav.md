---
navigation.title: Webdav
---

# Webdav

The driver is powered by the [`webdav`](https://www.npmjs.com/package/webdav) module, but currently only supports read-only use via standard username/password authentication.

Fetches all possible keys once and keep it in cache for 10 minutes. Cache only applies to fetching keys.

```js
import { createStorage } from "unstorage";
import webdavDriver from "unstorage/drivers/webdav";

const storage = createStorage({
  driver: gitlabDriver({
    serverURL: "https://nextcloud27.our-servers.de",
    username: "user",
    password: "demo123",
    // pathPrefix: "/remote.php/dav/files/",
    // directory: "/",
    // ttl: 600
  }),
});
```

**Options:**

- `serverURL`: Domain of Webdav host.
- `username`: Webdav username.
- `password`: Webdav user password.
- `pathPrefix`: Prefix to content path. Default is `/remote.php/dav/files/`
- `directory`: Root of content directory. Default is `/`
- `ttl`: Filenames cache revalidate time. Default is 600 seconds (10 minutes)
