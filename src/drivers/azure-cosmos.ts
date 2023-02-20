import { defineDriver } from "./utils";
import { Container, CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

export interface AzureCosmosOptions {
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

export default defineDriver((opts: AzureCosmosOptions = {}) => {
  const {
    endpoint = null,
    accountKey = null,
    databaseName = "unstorage",
    containerName = "unstorage",
  } = opts;
  if (!endpoint)
    throw new Error(
      "Azure CosmosDB driver requires an endpoint to be provided."
    );
  let client: Container;
  const getCosmosClient = async () => {
    if (!client) {
      if (accountKey) {
        const cosmosClient = new CosmosClient({ endpoint, key: accountKey });
        const { database } = await cosmosClient.databases.createIfNotExists({
          id: databaseName,
        });
        const { container } = await database.containers.createIfNotExists({
          id: containerName,
        });
        client = container;
      } else {
        const credential = new DefaultAzureCredential();
        const cosmosClient = new CosmosClient({
          endpoint,
          aadCredentials: credential,
        });
        const { database } = await cosmosClient.databases.createIfNotExists({
          id: databaseName,
        });
        const { container } = await database.containers.createIfNotExists({
          id: containerName,
        });
        client = container;
      }
    }
    return client;
  };

  return {
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
      await (await getCosmosClient())
        .item(key)
        .delete<AzureCosmosItem>({ consistencyLevel: "Session" });
    },
    async getKeys() {
      const iterator = (await getCosmosClient()).items.query<AzureCosmosItem>(
        `SELECT * from c`
      );
      return (await iterator.fetchAll()).resources.map((item) => item.id);
    },
    async getMeta(key) {
      const item = await (await getCosmosClient())
        .item(key)
        .read<AzureCosmosItem>();
      return {
        mtime: item.resource.modified,
      };
    },
    async clear() {
      const iterator = (await getCosmosClient()).items.query<AzureCosmosItem>(
        `SELECT * from c`
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
