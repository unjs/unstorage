---
navigation.title: Webdav
---

# Webdav

Store data on a WebDAV server such as [NextCloud](https://nextcloud.com/).

This driver implements meta for relavent [DAV properties](http://www.webdav.org/specs/rfc4918.html#dav.properties).

The driver currently only supports read-only functions.

```js
import { createStorage } from "unstorage";
import webdavDriver from "unstorage/drivers/webdav";

const storage = createStorage({
  driver: gitlabDriver({
    source: "https://nextcloud27.our-servers.de/remote.php/dav/files/user",
    username: "user",
    password: "demo123",
  }),
});
```

**Configuration Options:**

```js
export interface WebdavDriverOptions {
  // URI of WebDAV share:
  source: string;
  // WebDAV username:
  username?: string;
  // WebDAV password:
  password?: string;
  // Specify additional headers:
  headers: { [key: string]: string };
  // interval: number; (To-do: Implement polling)
  // Expiration of cache:
  ttl: number;
}
```

To use a subdirectory as root of storage, prepend source such as: `https://nextcloud27.our-servers.de/remote.php/dav/files/user/path/to/content`
