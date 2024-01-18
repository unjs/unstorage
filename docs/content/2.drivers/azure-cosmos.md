---
title: Azure Cosmos DB
description: Store data in Azure Cosmos DB NoSQL API documents.
---

## Usage

::tip{to="https://azure.microsoft.com/en-us/services/cosmos-db/"}
Learn more about Azure Cosmos DB.
::

This driver stores KV information in a NoSQL API Cosmos DB collection as documents. It uses the `id` field as the key and adds `value` and `modified` fields to the document.

To use it, you will need to install `@azure/cosmos` and `@azure/identity` in your project:

```bash
npm i @azure/cosmos @azure/identity
```

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
  ⚠️ Make sure that your Managed Identity or personal account has at least `Cosmos DB Built-in Data Contributor` role assigned to it. If you already are `Contributor` or `Owner` on the resource it should also be enough, but does not accomplish a model of least privilege.
- **`accountKey`**: CosmosDB account key. If not provided, the driver will use the DefaultAzureCredential (recommended).

**Options:**

- **`endpoint`** (required): CosmosDB endpoint in the format of `https://<account>.documents.azure.com:443/`.
- `accountKey`: CosmosDB account key. If not provided, the driver will use the DefaultAzureCredential (recommended).
- `databaseName`: The name of the database to use. Defaults to `unstorage`.
- `containerName`: The name of the container to use. Defaults to `unstorage`.
