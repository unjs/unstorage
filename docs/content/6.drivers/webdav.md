---
navigation.title: WebDAV
---

# WebDAV

Store data on a WebDAV server such as [NextCloud](https://nextcloud.com/).

This driver implements meta for relavent [DAV properties](http://www.webdav.org/specs/rfc4918.html#dav.properties).

The driver currently only supports read-only functions.

**Usage:**

```js
import { createStorage } from "unstorage";
import webdavDriver from "unstorage/drivers/webdav";

const storage = createStorage({
  driver: webdavDriver({
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
  headers?: { [key: string]: string };

  // To-do: Implement polling
  // interval: number;

  // Expiration of cache:
  ttl?: number;

  // Provides fallback mechanism (recursive re-fetching of subdirectories)
  // for any WebDAV service that does not support `Depth: "infinity"` header:
  infinityDepthHeaderUnavailable?: boolean;
}
```

To use a subdirectory within a WebDAV share, prepend source URI with `/path/to/content`:
`https://docs.example.org/remote.php/dav/files/user/path/to/content`
