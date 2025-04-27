import { createRequiredError, defineDriver } from "./utils";
import { Container, CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

export interface AzureCosmosOptions {
  /**
   * Optional client ID for managed identity. Needed if using one or more user assigned managed identity to authenticate.
   */
  managedIdentityClientId?: string;

  /**
   * CosmosDB connection string. If not provided, the driver will use the DefaultAzureCredential (recommended).
   */
  connectionString?: string;

  /**
   * CosmosDB endpoint in the format of https://<account>.documents.azure.com:443/.
   */
  endpoint?: string;

  /**
   * CosmosDB account key. If not provided, the driver will use the DefaultAzureCredential (recommended).
   */
  accountKey?: string;

  /**
   * The name of the database to use. Defaults to `unstorage`.
   * @default "unstorage"
   */
  databaseName?: string;

  /**
   * The name of the container to use. Defaults to `unstorage`.
   * @default "unstorage"
   */
  containerName?: string;
}

const DRIVER_NAME = "azure-cosmos";

export interface AzureCosmosItem {
  /**
   * The unstorage key as id of the item.
   */
  id: string;

  /**
   * The unstorage value of the item.
   */
  value: string;

  /**
   * The unstorage mtime metadata of the item.
   */
  modified: string | Date;
}

export default defineDriver((opts: AzureCosmosOptions) => {
  let client: Container;
  const getCosmosClient = async () => {
    if (client) {
      return client;
    }
    if (opts.accountKey && !opts.endpoint) {
      throw createRequiredError(DRIVER_NAME, "endpoint");
    }
    if (opts.connectionString) {
      const cosmosClient = new CosmosClient(opts.connectionString);
      const { database } = await cosmosClient.databases.createIfNotExists({
        id: opts.databaseName || "unstorage",
      });
      client = (
        await database.containers.createIfNotExists({
          id: opts.containerName || "unstorage",
        })
      ).container;
      return client;
    }
    if (opts.accountKey) {
      const cosmosClient = new CosmosClient({
        endpoint: opts.endpoint!,
        key: opts.accountKey,
      });
      const { database } = await cosmosClient.databases.createIfNotExists({
        id: opts.databaseName || "unstorage",
      });
      client = (
        await database.containers.createIfNotExists({
          id: opts.containerName || "unstorage",
        })
      ).container;
      return client;
    }
    const credential = opts.managedIdentityClientId
      ? new DefaultAzureCredential({
          managedIdentityClientId: opts.managedIdentityClientId,
        })
      : new DefaultAzureCredential();
    const cosmosClient = new CosmosClient({
      endpoint: opts.endpoint!,
      aadCredentials: credential,
    });
    const { database } = await cosmosClient.databases.createIfNotExists({
      id: opts.databaseName || "unstorage",
    });
    client = (
      await database.containers.createIfNotExists({
        id: opts.containerName || "unstorage",
      })
    ).container;
    return client;
  };

  return {
    name: DRIVER_NAME,
    options: opts,
    getInstance: getCosmosClient,
    async hasItem(key) {
      const item = await (await getCosmosClient())
        .item(key)
        .read<AzureCosmosItem>();
      return item.resource ? true : false;
    },
    async getItem(key) {
      const item = await (await getCosmosClient())
        .item(key)
        .read<AzureCosmosItem>();
      return item.resource ? item.resource.value : null;
    },
    async setItem(key, value) {
      const modified = new Date();
      await (
        await getCosmosClient()
      ).items.upsert<AzureCosmosItem>(
        { id: key, value, modified },
        { consistencyLevel: "Session" }
      );
    },
    async removeItem(key) {
      (await getCosmosClient())
        .item(key)
        .delete<AzureCosmosItem>({ consistencyLevel: "Session" })
        .catch(() => {});
    },
    async getKeys() {
      const iterator = (await getCosmosClient()).items.query<AzureCosmosItem>(
        `SELECT c.id from c`
      );
      return (await iterator.fetchAll()).resources.map((item) => item.id);
    },
    async getMeta(key) {
      const item = await (await getCosmosClient())
        .item(key)
        .read<AzureCosmosItem>();
      return {
        mtime: item.resource?.modified
          ? new Date(item.resource.modified)
          : undefined,
      };
    },
    async clear() {
      const iterator = (await getCosmosClient()).items.query<AzureCosmosItem>(
        `SELECT c.id from c`
      );
      const items = (await iterator.fetchAll()).resources;
      for (const item of items) {
        await (await getCosmosClient())
          .item(item.id)
          .delete<AzureCosmosItem>({ consistencyLevel: "Session" });
      }
    },
  };
});
