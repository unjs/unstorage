---
icon: mdi:github
---

# GitHub

> Map files from a remote GitHub repository (readonly).

## Usage

**Driver name:** `github`

This driver fetches all possible keys once and keep it in cache for 10 minutes. Due to GitHub rate limit, it is highly recommended to provide a token. It only applies to fetching keys.

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

- `repo`: GitHub repository. Format is `username/repo` or `org/repo` **(required)**
- `token`: GitHub API token. **(recommended)**
- `branch`: Target branch. Default is `main`
- `dir`: Use a directory as driver root.
- `ttl`: Filenames cache revalidate time. Default is `600` seconds (10 minutes)
- `apiURL`: GitHub API domain. Default is `https://api.github.com`
- `cdnURL`: GitHub RAW CDN Url. Default is `https://raw.githubusercontent.com`

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
