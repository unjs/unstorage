---
navigation.title: WebDAV
---

# WebDAV

Store data on a WebDAV server such as [NextCloud](https://nextcloud.com/).

This driver implements meta for relavent [DAV properties](http://www.webdav.org/specs/rfc4918.html#dav.properties).

**Usage:**

```ts
import { createStorage } from "unstorage";
import webdavDriver, { type WebdavFile } from "unstorage/drivers/webdav";

const storage = createStorage({
  driver: webdavDriver({
    source: "https://docs.example.org/remote.php/dav/files/user",
    username: "user",
    password: "secret",
  }),
});

const keys = await storage.getKeys();
const meta = (await storage.getMeta(
  "Documents:Example.md"
)) as WebdavFile["meta"];
const content = await storage.getMeta("Documents:Example.md");
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

  // Expiration of cache:
  ttl?: number;

  // Provides fallback mechanism (recursive re-fetching of subdirectories)
  // for any WebDAV service that does not support `Depth: "infinity"` header:
  infinityDepthHeaderUnavailable?: boolean;
}
```

To use a subdirectory within a WebDAV share, prepend source URI with `/path/to/content`:
`https://docs.example.org/remote.php/dav/files/user/path/to/content`

By default, `ttl` is undefined and cache is never invalidated except by calling `getKeys()`, which always refetches metadata, including the 'etag' for each resource, which uniquely identifies its version. This is used to invalidate the cache of the content of each resource.
