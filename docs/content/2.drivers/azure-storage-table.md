# Azure Table Storage

Store data in a Azure table storage.

## Usage

::tip{to="https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/tables/data-tables"}
Learn more about Azure table storage.
::

::warning
This driver is currently not compatible with edge workers like Cloudflare Workers or Vercel Edge Functions. There may be a http based driver in the future.
::

Store data in a [data-tables]().

This driver stores KV information in a Azure table storage. The same partition key is used for all keys and the field `unstorageValue` is used to store the value.

To use it, you will need to install `@azure/data-table` and `@azure/identity` in your project:

```bash
npm i @azure/data-table @azure/identity
```

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

- **`DefaultAzureCredential`**: This is the recommended way to authenticate. It will use managed identity or environment variables to authenticate the request. It will also work in a local environment by trying to use Azure CLI or Azure PowerShell to authenticate.

  ⚠️ Make sure that your Managed Identity or personal account has the `Storage Table Data Contributor` role assigned to it, even if you already are `Contributor` or `Owner` on the storage account.

- **`AzureNamedKeyCredential`** (only available in Node.js runtime): This will use the `accountName` and `accountKey` to authenticate the request.
- **`AzureSASCredential`**: This will use the `accountName` and `sasToken` to authenticate the request.
- **connection string** (only available in Node.js runtime): This will use the `connectionString` to authenticate the request. This is not recommended as it will expose your account key in plain text.

**Options:**

- **`accountName`** (required): The name of your storage account.
- `tableName`: The name of the table to use. Defaults to `unstorage`.
- `partitionKey`: The partition key to use. Defaults to `unstorage`.
- `accountKey`: The account key to use for authentication. This is only required if you are using `AzureNamedKeyCredential`.
-
