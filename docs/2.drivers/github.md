---
icon: mdi:github
---

# GitHub

> Read files from a remote GitHub repository.

## Usage

**Driver name:** `github`

This read-only driver fetches the repository file list and caches it for 10 minutes by default. Providing a token is strongly recommended to avoid GitHub API rate limits. File contents are fetched separately from the raw content URL, using the same token.

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

## Private repositories

To read a **private** repository, provide a GitHub access token via the `token` option. The same token is used both to list the keys (GitHub API) and to fetch file contents (raw CDN), so it needs read access to the repository's contents.

Either token type works:

- **Fine-grained token** ([recommended](https://github.blog/security/application-security/introducing-fine-grained-personal-access-tokens-for-github/)): grant it read-only **Contents** access, limited to the target repository.
- **Classic token** ([settings](https://github.com/settings/tokens)): grant it the `repo` scope.

Read the token from an environment variable instead of hard-coding it:

```js
import { createStorage } from "unstorage";
import githubDriver from "unstorage/drivers/github";

const storage = createStorage({
  driver: githubDriver({
    repo: "username/private-repo",
    branch: "main",
    token: process.env.GITHUB_TOKEN,
  }),
});
```

::note
GitHub Apps are not supported — use a personal access token.
::
