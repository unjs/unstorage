---
icon: mdi:github
---

# GitHub

> Read files from a remote GitHub repository.

## Usage

**Driver name:** `github`

This read-only driver fetches the repository file list and caches it for 10 minutes by default. Providing a token is strongly recommended to avoid GitHub API rate limits. File contents are fetched separately from the raw content URL.

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

- `repo` (**required**): Repository in `owner/name` format.
- `token` (recommended): GitHub API token.
- `branch`: Target branch. Defaults to `main`.
- `dir`: Directory to use as the driver root.
- `ttl`: File-list cache duration in seconds. Defaults to `600` (10 minutes).
- `apiURL`: GitHub API base URL. Defaults to `https://api.github.com`.
- `cdnURL`: Raw content base URL. Defaults to `https://raw.githubusercontent.com`.
