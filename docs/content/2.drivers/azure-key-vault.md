# Azure Key Vault

Store data in a Azure Key Vault secrets.

## Usage

::note{to="https://docs.microsoft.com/en-us/azure/key-vault/secrets/about-secrets"}
Learn more about Azure Key Vault secrets.
::

This driver stores KV information in Azure Key Vault secrets by using the key as secret id and the value as secret content.
Please be aware that key vault secrets don't have the fastest access time and are not designed for high throughput. You also have to disable purge protection for your key vault to be able to delete secrets. This implementation deletes and purges a secret when it is deleted to avoid conflicts with soft delete.

⚠️ Be aware that this driver stores the keys of your `key:value` pairs in an encoded way in Key Vault to avoid conflicts with naming requirements for secrets. This means that you will not be able to access manually (outside of unstorage) created secrets inside your Key Vault, as long as they are not encoded in the same way.

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

⚠️ Make sure that your Managed Identity or personal account has either the `Key Vault Secrets Officer` (or `Key Vault Secrets User` for read-only) RBAC role assigned or is a member of an access policy that grants `Get`, `List`, `Set`, `Delete` and `Purge` secret permissions.

**Options:**

- **`vaultName`** (required): The name of the key vault to use.
- `serviceVersion`: Version of the Azure Key Vault service to use. Defaults to 7.3.
- `pageSize`: The number of entries to retrieve per request. Impacts getKeys() and clear() performance. Maximum value is 25.
