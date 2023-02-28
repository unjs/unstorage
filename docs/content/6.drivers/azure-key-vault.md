# Azure Key Vault

Store data in a Azure Key Vault [secrets](https://docs.microsoft.com/en-us/azure/key-vault/secrets/about-secrets).

This driver stores KV information in Azure Key Vault secrets by using the key as secret id and the value as secret content.
Please be aware that key vault secrets don't have the fastest access time and are not designed for high throughput. You also have to disable purge protection for your key vault to be able to delete secrets. This implementation deletes and purges a secret when it is deleted to avoid conflicts with soft delete.

To use it, you will need to install `@azure/keyvault-secrets` and `@azure/identity` in your project:

```bash
npm i @azure/keyvault-secrets @azure/identity
```

Usage:

```js
import { createStorage } from "unstorage";
import azureKeyVault from "unstorage/drivers/azure-key-vault";

const storage = createStorage({
  driver: azureKeyVault({
    vaultName: "testunstoragevault",
  }),
});
```

**Authentication:**

The driver supports the following authentication methods:

- **`DefaultAzureCredential`**: This is the recommended way to authenticate. It will use managed identity or environment variables to authenticate the request. It will also work in a local environment by trying to use Azure CLI or Azure PowerShell to authenticate.

   ⚠️ Make sure that your Managed Identity or personal account has either the `Key Vault Secrets Officer` RBAC role assigned or is a member of an access policy that grants `Get`, `List`, `Set`, `Delete` and `Purge` secret permissions.

**Options:**

- **`vaultName`** (required): The name of the key vault to use.
- `serviceVersion`: Version of the Azure Key Vault service to use. Defaults to 7.3.
- `pageSize`: The number of entries to retrieve per request. Impacts getKeys() and clear() performance. Maximum value is 25.
