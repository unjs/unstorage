# Azure Blob Storage

Store data in a Azure blob storage.

## Usage

::tip{to="https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/storage/storage-blob"}
Learn more about Azure blob storage.
::

This driver stores KV information in a Azure blob storage blob. The same container is used for all entries. Each entry is stored in a separate blob with the key as the blob name and the value as the blob content.

To use it, you will need to install `@azure/storage-blob` and `@azure/identity` in your project:

```bash
npm i @azure/storage-blob @azure/identity
```

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
- **`AzureSASCredential`**: This will use the `accountName` and `sasToken` to authenticate the request.
- **connection string** (only available in Node.js runtime): This will use the `connectionString` to authenticate the request. This is not recommended as it will expose your account key in plain text.

**Options:**

- **`accountName`** (required): The name of your storage account.
- `containerName`: The name of the blob container to use. Defaults to `unstorage`.
- `accountKey`: The account key to use for authentication. This is only required if you are using `AzureNamedKeyCredential`.
- `sasKey`: The SAS token to use for authentication. This is only required if you are using `AzureSASCredential`.
- `connectionString`: The storage accounts' connection string. `accountKey` and `sasKey` take precedence.
