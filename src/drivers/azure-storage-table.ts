import { defineDriver } from "./utils";
import {
  TableClient,
  AzureNamedKeyCredential,
  AzureSASCredential,
  TableEntity,
} from "@azure/data-tables";
import { DefaultAzureCredential } from "@azure/identity";

export interface AzureStorageTableOptions {
  /**
   * The name of the Azure Storage account.
   * @default null
   */
  accountName?: string;
  /**
   * The name of the table. All entities will be stored in the same table.
   * @default 'unstorage'
   */
  tableName?: string;
  /**
   * The partition key. All entities will be stored in the same partition.
   * @default 'unstorage'
   */
  partitionKey?: string;
  /**
   * The account key. If provided, the SAS key will be ignored. Only available in Node.js runtime.
   * @default null
   */
  accountKey?: string;
  /**
   * The SAS key. If provided, the account key will be ignored.
   * @default null
   */
  sasKey?: string;
  /**
   * The connection string. If provided, the account key and SAS key will be ignored. Only available in Node.js runtime.
   * @default null
   */
  connectionString?: string;
}

export default defineDriver((opts: AzureStorageTableOptions = {}) => {
  const {
    accountName = null,
    tableName = "unstorage",
    partitionKey = "unstorage",
    accountKey = null,
    sasKey = null,
    connectionString = null,
  } = opts;
  let client: TableClient;
  if (accountKey) {
    // AzureNamedKeyCredential is only available in Node.js runtime, not in browsers
    const credential = new AzureNamedKeyCredential(accountName, accountKey);
    client = new TableClient(
      `https://${accountName}.table.core.windows.net`,
      tableName,
      credential
    );
  } else if (sasKey) {
    const credential = new AzureSASCredential(sasKey);
    client = new TableClient(
      `https://${accountName}.table.core.windows.net`,
      tableName,
      credential
    );
  } else if (connectionString) {
    // fromConnectionString is only available in Node.js runtime, not in browsers
    client = TableClient.fromConnectionString(connectionString, tableName);
  } else {
    const credential = new DefaultAzureCredential();
    client = new TableClient(
      `https://${accountName}.table.core.windows.net`,
      tableName,
      credential
    );
  }

  return {
    async hasItem(key) {
      try {
        await client.getEntity(partitionKey, key);
        return true;
      } catch {
        return false;
      }
    },
    async getItem(key) {
      try {
        const result = await client.getEntity(partitionKey, key);
        return result.unstorageValue;
      } catch {
        return null;
      }
    },
    async setItem(key, value) {
      const entity: TableEntity = {
        partitionKey,
        rowKey: key,
        unstorageValue: value,
      };
      await client.upsertEntity(entity, "Replace");
      return;
    },
    async removeItem(key) {
      await client.deleteEntity(partitionKey, key);
      return;
    },
    async getKeys() {
      const iterator = client.listEntities().byPage({ maxPageSize: 1000 });
      const keys = [];
      for await (const page of iterator) {
        const pageKeys = page.map((entity) => entity.rowKey);
        keys.push(...pageKeys);
      }
      return keys;
    },
    async clear() {
      const iterator = client.listEntities().byPage({ maxPageSize: 1000 });
      for await (const page of iterator) {
        await Promise.all(
          page.map(
            async (entity) =>
              await client.deleteEntity(entity.partitionKey, entity.rowKey)
          )
        );
      }
    },
  };
});
