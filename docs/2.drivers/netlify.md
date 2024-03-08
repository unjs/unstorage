---
icon: teenyicons:netlify-solid
---

# Netlify Blobs

> Store data in Netlify Blobs.

## Usage

Store data in a [Netlify Blobs](https://docs.netlify.com/blobs/overview/) store. This is supported in both edge and Node.js function runtimes, as well at during builds.

```js
import { createStorage } from "unstorage";
import netlifyBlobsDriver from "unstorage/drivers/netlify-blobs";

const storage = createStorage({
  driver: netlifyBlobsDriver({
    name: "blob-store-name",
  }),
});
```

You can use Unstorage in a Netlify edge function without installing any dependencies:

```js
import { createStorage } from "https://esm.sh/unstorage";
import netlifyBlobsDriver from "https://esm.sh/unstorage/drivers/netlify-blobs";

export default async function handler(request: Request) {

  const storage = createStorage({
    driver: netlifyBlobsDriver({
      name: "blob-store-name",
    }),
  });

  // ...
}
```

You can create a deploy-scoped store by settings `deployScoped` option to `true`. This will mean that the deploy only has access to its own store. The store is managed alongside the deploy, with the same deploy previews, deletes, and rollbacks. This is required during builds, which only have access to deploy-scoped stores.

```js
import { createStorage } from "unstorage";
import netlifyBlobsDriver from "unstorage/drivers/netlify-blobs";

const storage = createStorage({
  driver: netlifyBlobsDriver({
    deployScoped: true,
  }),
});
```

To use, you will need to install `@netlify/blobs` as dependency or devDependency in your project:

```json
{
  "devDependencies": {
    "@netlify/blobs": "latest"
  }
}
```

**Options:**

- `name` - The name of the store to use. It is created if needed. This is required except for deploy-scoped stores.
- `deployScoped` - If set to `true`, the store is scoped to the deploy. This means that it is only available from that deploy, and will be deleted or rolled-back alongside it.
- `siteID` - Required during builds, where it is available as `constants.SITE_ID`. At runtime this is set automatically.
- `token` - Required during builds, where it is available as `constants.NETLIFY_API_TOKEN`. At runtime this is set automatically.

**Advanced options:**

These are not normally needed, but are available for advanced use cases or for use in unit tests.

- `apiURL`
- `edgeURL`
