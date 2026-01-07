import {
  createError,
  createRequiredError,
  defineDriver,
} from "./utils/index.ts";
import type { DriverFactory } from "./utils/index.ts";
import {
  TableClient,
  AzureNamedKeyCredential,
  AzureSASCredential,
  type TableEntity,
} from "@azure/data-tables";
import { DefaultAzureCredential } from "@azure/identity";

export interface AzureStorageTableOptions {
  /**
   * The name of the Azure Storage account.
   */
  accountName: string;

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
   */
  accountKey?: string;

  /**
   * The SAS key. If provided, the account key will be ignored.
   */
  sasKey?: string;
  /**
   * The connection string. If provided, the account key and SAS key will be ignored. Only available in Node.js runtime.
   */
  connectionString?: string;

  /**
   * The number of entries to retrive per request. Impacts getKeys() and clear() performance. Maximum value is 1000.
   * @default 1000
   */
  pageSize?: number;
}

const DRIVER_NAME = "azure-storage-table";

const driver: DriverFactory<AzureStorageTableOptions, TableClient> =
  defineDriver((opts: AzureStorageTableOptions) => {
    const {
      accountName = null,
      tableName = "unstorage",
      partitionKey = "unstorage",
      accountKey = null,
      sasKey = null,
      connectionString = null,
      pageSize = 1000,
    } = opts;

    let client: TableClient;
    const getClient = () => {
      if (client) {
        return client;
      }
      if (!accountName) {
        throw createRequiredError(DRIVER_NAME, "accountName");
      }
      if (pageSize > 1000) {
        throw createError(
          DRIVER_NAME,
          "`pageSize` exceeds the maximum allowed value of `1000`"
        );
      }
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
      return client;
    };

    return {
      name: DRIVER_NAME,
      options: opts,
      getInstance: getClient,
      async hasItem(key) {
        try {
          await getClient().getEntity(partitionKey, key);
          return true;
        } catch {
          return false;
        }
      },
      async getItem(key) {
        try {
          const entity = await getClient().getEntity(partitionKey, key);
          return entity.unstorageValue;
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
        await getClient().upsertEntity(entity, "Replace");
      },
      async removeItem(key) {
        await getClient().deleteEntity(partitionKey, key);
      },
      async getKeys() {
        const iterator = getClient()
          .listEntities()
          .byPage({ maxPageSize: pageSize });
        const keys: string[] = [];
        for await (const page of iterator) {
          const pageKeys = page
            .map((entity) => entity.rowKey)
            .filter(Boolean) as string[];
          keys.push(...pageKeys);
        }
        return keys;
      },
      async getMeta(key) {
        const entity = await getClient().getEntity(partitionKey, key);
        return {
          mtime: entity.timestamp ? new Date(entity.timestamp) : undefined,
          etag: entity.etag,
        };
      },
      async clear() {
        const iterator = getClient()
          .listEntities()
          .byPage({ maxPageSize: pageSize });
        for await (const page of iterator) {
          await Promise.all(
            page.map(async (entity) => {
              if (entity.partitionKey && entity.rowKey) {
                await getClient().deleteEntity(
                  entity.partitionKey,
                  entity.rowKey
                );
              }
            })
          );
        }
      },
    };
  });

export default driver;
