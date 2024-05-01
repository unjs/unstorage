---
icon: teenyicons:netlify-solid
---

# Netlify Blobs

> Store data in Netlify Blobs.

Store data in a [Netlify Blobs](https://docs.netlify.com/blobs/overview/) store. This is supported in both [edge](#using-in-netlify-edge) and Node.js function runtimes, as well as during builds.

::read-more{title="Netlify Blobs" to="https://docs.netlify.com/blobs/overview/"}
::

## Usage

```js
import { createStorage } from "unstorage";
import netlifyBlobsDriver from "unstorage/drivers/netlify-blobs";

const storage = createStorage({
  driver: netlifyBlobsDriver({
    name: "blob-store-name",
  }),
});
```

You can create a deploy-scoped store by setting `deployScoped` option to `true`. This will mean that the deploy only has access to its own store. The store is managed alongside the deploy, with the same deploy previews, deletes, and rollbacks. This is required during builds, which only have access to deploy-scoped stores.

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

## Using in netlify edge

When using Unstorage in a Netlify edge function you should use a URL import. This does not apply if you are compiling your code in a framework - just if you are creating your own edge functions.

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

## Updating stores from Netlify Blobs beta

There has been a change in the way global blob stores are stored in `@netlify/blobs` version `7.0.0` which means that you will not be able to access objects in global stores created by older versions until you migrate them. This does not affect deploy-scoped stores, nor does it affect objects created with the new version. You can migrate objects in your old stores by running the following command in the project directory using the latest version of the Netlify CLI:

```sh
netlify recipes blobs-migrate <name of store>
```
