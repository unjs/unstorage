---
icon: mdi:microsoft-azure
---

# Azure

## Azure App Configuration

Store data in the key-value store of Azure App Configuration.

### Usage

**Driver name:** `azure-app-configuration`

::note{to="https://learn.microsoft.com/en-us/azure/azure-app-configuration/overview"}
Learn more about Azure App Configuration.
::

This driver uses the configuration store as a key-value store. It uses the `key` as the name and the `value` as content. You can also use labels to differentiate between different environments (dev, prod, etc.) and use prefixes to differentiate between different applications (app01, app02, etc.).

Install `@azure/app-configuration`. Also install `@azure/identity` when using `DefaultAzureCredential` instead of a connection string.

:pm-install{name="@azure/app-configuration"}

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
  ⚠️ Make sure that your Managed Identity or personal account has the `App Configuration Data Owner` role assigned to it, even if you already are the `Contributor` or `Owner` on the app configuration resource.
- **`connectionString`**: The app configuration connection string. Not recommended for use in production.

**Options:**

- `appConfigName`: The name of the app configuration resource.
- `endpoint`: The endpoint of the app configuration resource.
- `connectionString`: The connection string of the app configuration resource.
- `prefix`: Optional prefix for keys. This can be used to isolate keys from different applications in the same Azure App Configuration instance. E.g. "app01" results in keys like "app01:foo" and "app01:bar".
- `label`: Optional label for keys. If not provided, all keys will be created and listed without labels. This can be used to isolate keys from different environments in the same Azure App Configuration instance. E.g. "dev" results in keys like "foo" and "bar" with the label "dev".

## Azure Cosmos DB

Store data in Azure Cosmos DB NoSQL API documents.

### Usage

**Driver name:** `azure-cosmos`

::note{to="https://azure.microsoft.com/en-us/services/cosmos-db/"}
Learn more about Azure Cosmos DB.
::

This driver stores KV information in a NoSQL API Cosmos DB collection as documents. It uses the `id` field as the key and adds `value` and `modified` fields to the document.

Install `@azure/cosmos`. Also install `@azure/identity` when using `DefaultAzureCredential` instead of an account key.

:pm-install{name="@azure/cosmos"}

Usage:

```js
import { createStorage } from "unstorage";
import azureCosmos from "unstorage/drivers/azure-cosmos";

const storage = createStorage({
  driver: azureCosmos({
    endpoint: "ENDPOINT",
    accountKey: "ACCOUNT_KEY",
  }),
});
```

**Authentication:**

- **`DefaultAzureCredential`**: This is the recommended way to authenticate. It will use managed identity or environment variables to authenticate the request. It will also work in a local environment by trying to use Azure CLI or Azure PowerShell to authenticate. <br>
  ⚠️ Make sure that your Managed Identity or personal account has at least `Cosmos DB Built-in Data Contributor` role assigned to it. If you already are the `Contributor` or `Owner` on the resource it should also be enough, but that does not accomplish a model of least privilege.
- **`accountKey`**: CosmosDB account key. If not provided, the driver will use the DefaultAzureCredential (recommended).

**Options:**

- **`endpoint`** (required): CosmosDB endpoint in the format of `https://<account>.documents.azure.com:443/`.
- `accountKey`: CosmosDB account key. If not provided, the driver will use the DefaultAzureCredential (recommended).
- `databaseName`: The name of the database to use. Defaults to `unstorage`.
- `containerName`: The name of the container to use. Defaults to `unstorage`.

## Azure Key Vault

Store data as Azure Key Vault secrets.

### Usage

**Driver name:** `azure-key-vault`

::note{to="https://docs.microsoft.com/en-us/azure/key-vault/secrets/about-secrets"}
Learn more about Azure Key Vault secrets.
::

This driver stores KV information in Azure Key Vault secrets by using the key as secret id and the value as secret content.
Please be aware that key vault secrets don't have the fastest access time and are not designed for high throughput. You also have to disable purge protection for your key vault to be able to delete secrets. This implementation deletes and purges a secret when it is deleted to avoid conflicts with soft delete.

⚠️ Be aware that this driver stores the keys of your `key:value` pairs in an encoded way in Key Vault to avoid conflicts with naming requirements for secrets. This means that you will not be able to access manually (outside of unstorage) created secrets inside your Key Vault, as long as they are not encoded in the same way.

To use it, you will need to install `@azure/keyvault-secrets` and `@azure/identity` in your project:

:pm-install{name="@azure/keyvault-secrets @azure/identity"}

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

## Azure Blob Storage

Store data in Azure Blob Storage.

### Usage

**Driver name:** `azure-storage-blob`

::note{to="https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/storage/storage-blob"}
Learn more about Azure blob storage.
::

The driver uses one container and stores each entry as a separate blob, with the storage key as the blob name.

Install `@azure/storage-blob`. Also install `@azure/identity` when using `DefaultAzureCredential`.

:pm-install{name="@azure/storage-blob"}

Please make sure that the container you want to use exists in your storage account.

```js
import { createStorage } from "unstorage";
import azureStorageBlobDriver from "unstorage/drivers/azure-storage-blob";

const storage = createStorage({
  driver: azureStorageBlobDriver({
    accountName: "myazurestorageaccount",
  }),
});
```

**Authentication:**

The driver supports the following authentication methods:

- **`DefaultAzureCredential`**: This is the recommended way to authenticate. It will use managed identity or environment variables to authenticate the request. It will also work in a local environment by trying to use Azure CLI or Azure PowerShell to authenticate. <br>
  ⚠️ Make sure that your Managed Identity or personal account has the `Storage Blob Data Contributor` role assigned to it, even if you already are `Contributor` or `Owner` on the storage account.
- **`AzureNamedKeyCredential`** (only available in Node.js runtime): This will use the `accountName` and `accountKey` to authenticate the request.
- **`AzureSASCredential`**: Uses `accountName` and `sasKey` to authenticate the request.
- **connection string** (only available in Node.js runtime): This will use the `connectionString` to authenticate the request. This is not recommended as it will expose your account key in plain text.

**Options:**

- `accountName`: Storage account name. Required unless `connectionString` or `sasUrl` is provided.
- `containerName`: The name of the blob container to use. Defaults to `unstorage`.
- `accountKey`: The account key to use for authentication. This is only required if you are using `AzureNamedKeyCredential`.
- `sasKey`: The SAS token to use for authentication. This is only required if you are using `AzureSASCredential`.
- `sasUrl`: The SAS URL of the storage account. This is an alternative to providing `accountName` and `sasKey` separately. The URL can be either:
  - A storage account URL: `https://<account>.blob.core.windows.net?<sas-token>`
  - A container URL: `https://<account>.blob.core.windows.net/<container>?<sas-token>` you must specify the `containerName` option
- `connectionString`: Storage account connection string for Node.js.
- `endpointSuffix`: Storage account endpoint suffix. Needs to be changed for Microsoft Azure operated by 21Vianet, Azure Government or Azurite. Defaults to `.blob.core.windows.net`.

## Azure Table Storage

Store data in Azure Table Storage.

### Usage

**Driver name:** `azure-storage-table`

::note{to="https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/tables/data-tables"}
Learn more about Azure Table storage.
::

::warning
This driver is currently not compatible with edge workers like Cloudflare Workers or Vercel Edge Functions. There may be an HTTP-based driver in the future.
::

The driver stores all keys in one partition, using the storage key as the `rowKey` and the `unstorageValue` field for values. `getMeta()` returns the entity's last modified time (`mtime`) and `etag`.

Install `@azure/data-tables`. Also install `@azure/identity` when using `DefaultAzureCredential` instead of an account key, SAS key, or connection string.

:pm-install{name="@azure/data-tables"}

Please make sure that the table you want to use exists in your storage account.

```js
import { createStorage } from "unstorage";
import azureStorageTableDriver from "unstorage/drivers/azure-storage-table";

const storage = createStorage({
  driver: azureStorageTableDriver({
    accountName: "myazurestorageaccount",
  }),
});
```

**Authentication:**

The driver supports the following authentication methods:

- **`AzureNamedKeyCredential`** (Node.js only): Uses `accountName` and `accountKey`.
- **`AzureSASCredential`**: Uses `accountName` and `sasKey`.
- **Connection string** (Node.js only): Uses `connectionString`. Keep connection strings secret because they contain account credentials.
- **`DefaultAzureCredential`**: Used when none of the above is set. Uses managed identity, environment variables, the Azure CLI, or Azure PowerShell. Install `@azure/identity` and assign the `Storage Table Data Contributor` role.

Options are checked in the order above: `accountKey` takes precedence over `sasKey`, which takes precedence over `connectionString`.

**Options:**

- **`accountName`** (required): Storage account name.
- `tableName`: Table name. Defaults to `unstorage`.
- `partitionKey`: Partition key shared by all entries. Defaults to `unstorage`.
- `accountKey`: Account key for `AzureNamedKeyCredential` authentication. Node.js only. Takes precedence over `sasKey` and `connectionString`.
- `sasKey`: SAS key for `AzureSASCredential` authentication. Takes precedence over `connectionString`.
- `connectionString`: Connection string for Node.js authentication.
- `pageSize`: Entries retrieved per request by `getKeys()` and `clear()`. Defaults to `1000`, which is also the maximum.
- `lib`: An imported `@azure/data-tables` module or a function that returns it.
- `identityLib`: An imported `@azure/identity` module or a function that returns it.
