# `azure-app-configuration`

Store data in the key value store of [Azure App Configuration](https://learn.microsoft.com/en-us/azure/azure-app-configuration/overview).

This driver uses the configuration store as a key value store. It uses the `key` as the name and the `value` as content. You can also use labels to differentiate between different environments (dev, prod, etc.) and use prefixes to differentiate between different applications (app01, app02, etc.).

To use it, you will need to install `@azure/app-configuration` and `@azure/identity` in your project:

```json
{
  "dependencies": {
    "@azure/app-configuration": "^1.3.1",
    "@azure/identity": "^3.1.3",
  }
}
```

Usage:

```js
import { createStorage } from "unstorage";
import azureAppConfiguration from "unstorage/drivers/azure-app-configuration";
const storage = createStorage({
    driver: azureAppConfiguration({
      appConfigName: "unstoragetest",
      label: "dev",
      prefix: "app01",
    }),
});
```

**Authentication:**

The driver supports the following authentication methods:

- **`DefaultAzureCredential`**: This is the recommended way to authenticate. It will use managed identity or environment variables to authenticate the request. It will also work in a local environment by trying to use Azure CLI or Azure PowerShell to authenticate. <br>
⚠️ Make sure that your Managed Identity or personal account has the `App Configuration Data Owner` role assigned to it, even if you already are `Contributor` or `Owner` on the app configuration resource.
- **`connectionString`**: The app configuration connection string. Not recommended for use in production.

**Options:**

- `appConfigName`: The name of the app configuration resource.
- `endpoint`: The endpoint of the app configuration resource.
- `connectionString`: The connection string of the app configuration resource.
- `prefix`: Optional prefix for keys. This can be used to isolate keys from different applications in the same Azure App Configuration instance. E.g. "app01" results in keys like "app01:foo" and "app01:bar".
- `label`: Optional label for keys. If not provided, all keys will be created and listed without labels. This can be used to isolate keys from different environments in the same Azure App Configuration instance. E.g. "dev" results in keys like "foo" and "bar" with the label "dev".
