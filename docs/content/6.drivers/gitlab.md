---
navigation.title: Gitlab
---

# Gitlab

Map files from a remote gitlab repository (readonly).

This driver fetches all possible keys once and keep it in cache for 10 minutes. Cache only applies to fetching keys.

```js
import { createStorage } from "unstorage";
import gitlabDriver from "unstorage/drivers/gitlab";

const storage = createStorage({
  driver: gitlabDriver({
    repo: "nuxt/nuxt",
    branch: "main",
    base: "/docs",
  }),
});
```

**Authentication:**

The driver supports the following authentication methods:

- **`OAuth2 (pkce)`**: See the [gitlab doc](https://docs.gitlab.com/ee/api/oauth2.html). This is the recommended way to authenticate on a public website. You should bring your own OAuth library to use a gitlab instance as an identity provider. Once you get the authentication access token (jwt), you should set it in the `headers` option. Ex: `{ Authorization: 'Bearer ...' }`
- **`Private token`**: For direct authentication with [private token](https://docs.gitlab.com/ee/development/documentation/restful_api_styleguide.html#curl-commands). Not recommended for use in production, or only in private website.

**Options:**

- `apiURL`: Gitlab API domain. Default is `https://gitlab.com`
- `repo`: Gitlab repository. Format is `username/repo` or `org/repo` **(required)**.
- `getHeaders`: **(recommended)** See above. A function that return headers. Here you can add the authorization token.
- `branch`: Target branch or tag. Default is `main`.
- `base`: Path of a directory to use as driver root.
- `ttl`: Filenames cache revalidate time. Default is `600` seconds (10 minutes).
