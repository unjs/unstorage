---
navigation.title: GitHub
---

### GitHub

Map files from a remote github repository (readonly).

This driver fetches all possible keys once and keep it in cache for 10 minutes. Due to GitHub rate limit, it is highly recommanded to provide a token. It only applies to fetching keys.

```js
import { createStorage } from "unstorage";
import githubDriver from "unstorage/drivers/github";

const storage = createStorage({
  driver: githubDriver({
    repo: "nuxt/nuxt",
    branch: "main",
    dir: "/docs",
  }),
});
```

**Options:**

- `repo`: Github repository. Format is `username/repo` or `org/repo` **(required)**
- `token`: Github API token. **(recommended)**
- `branch`: Target branch. Default is `main`
- `dir`: Use a directory as driver root.
- `ttl`: Filenames cache revalidate time. Default is `600` seconds (10 minutes)
- `apiURL`: Github API domain. Default is `https://api.github.com`
- `cdnURL`: Github RAW CDN Url. Default is `https://raw.githubusercontent.com`
