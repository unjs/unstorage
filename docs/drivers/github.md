### `github`

Map files from a remote github repository. (readonly)

This driver fetches all possible keys once and keep it in cache for 10 minutes. Because of github rate limit, it is highly recommanded to provide a token. It only applies to fetching keys.

```js
import { createStorage } from "unstorage";
import githubDriver from "unstorage/drivers/github";

const storage = createStorage({
  driver: githubDriver({
    repo: "nuxt/framework",
    branch: "main",
    dir: "/docs/content",
  }),
});
```

**Options:**

- **`repo`**: Github repository. Format is `username/repo` or `org/repo`. (Required!)
- **`token`**: Github API token. (Recommended!)
- `branch`: Target branch. Default is `main`
- `dir`: Use a directory as driver root.
- `ttl`: Filenames cache revalidate time. Default is `600` seconds (10 minutes)
- `apiURL`: Github API domain. Default is `https://api.github.com`
- `cdnURL`: Github RAW CDN Url. Default is `https://raw.githubusercontent.com`
