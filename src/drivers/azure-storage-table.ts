import {
  createError,
  createRequiredError,
  type DriverFactory,
  importLib,
  type LibImport,
  type DriverDependencies,
} from "./utils/index.ts";
import { type AzureIdentityOptions, createDefaultAzureCredential } from "./utils/azure.ts";
import type { TableClient, TableEntity } from "@azure/data-tables";

export interface AzureStorageTableOptions extends AzureIdentityOptions {
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

  /**
   * Optionally provide the [`@azure/data-tables`](https://www.npmjs.com/package/@azure/data-tables)
   * library to avoid dynamically importing it.
   */
  lib?: LibImport<typeof import("@azure/data-tables")>;
}

export const DRIVER_DEPENDENCIES: DriverDependencies = {
  lib: { name: "@azure/data-tables", version: "^13.3.2" },
  identityLib: { name: "@azure/identity", version: "^4.13.0", optional: true },
};

const DRIVER_NAME = "azure-storage-table";

const driver: DriverFactory<AzureStorageTableOptions, Promise<TableClient>> = (opts) => {
  const {
    accountName = null,
    tableName = "unstorage",
    partitionKey = "unstorage",
    accountKey = null,
    sasKey = null,
    connectionString = null,
    pageSize = 1000,
  } = opts;

  let client: Promise<TableClient> | undefined;
  const getClient = () =>
    (client ??= (async () => {
      if (!accountName) {
        throw createRequiredError(DRIVER_NAME, "accountName");
      }
      if (pageSize > 1000) {
        throw createError(DRIVER_NAME, "`pageSize` exceeds the maximum allowed value of `1000`");
      }
      const { TableClient, AzureNamedKeyCredential, AzureSASCredential } = await importLib(
        DRIVER_NAME,
        "@azure/data-tables",
        opts.lib,
        () => import("@azure/data-tables"),
      );
      const url = `https://${accountName}.table.core.windows.net`;
      if (accountKey) {
        // AzureNamedKeyCredential is only available in Node.js runtime, not in browsers
        return new TableClient(
          url,
          tableName,
          new AzureNamedKeyCredential(accountName, accountKey),
        );
      }
      if (sasKey) {
        return new TableClient(url, tableName, new AzureSASCredential(sasKey));
      }
      if (connectionString) {
        // fromConnectionString is only available in Node.js runtime, not in browsers
        return TableClient.fromConnectionString(connectionString, tableName);
      }
      return new TableClient(url, tableName, await createDefaultAzureCredential(DRIVER_NAME, opts));
    })());

  return {
    name: DRIVER_NAME,
    options: opts,
    getInstance: getClient,
    async hasItem(key) {
      try {
        await (await getClient()).getEntity(partitionKey, key);
        return true;
      } catch {
        return false;
      }
    },
    async getItem(key) {
      try {
        const entity = await (await getClient()).getEntity(partitionKey, key);
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
      await (await getClient()).upsertEntity(entity, "Replace");
    },
    async removeItem(key) {
      await (await getClient()).deleteEntity(partitionKey, key);
    },
    async getKeys() {
      const iterator = (await getClient()).listEntities().byPage({ maxPageSize: pageSize });
      const keys: string[] = [];
      for await (const page of iterator) {
        const pageKeys = page.map((entity) => entity.rowKey).filter(Boolean) as string[];
        keys.push(...pageKeys);
      }
      return keys;
    },
    async getMeta(key) {
      const entity = await (await getClient()).getEntity(partitionKey, key);
      return {
        mtime: entity.timestamp ? new Date(entity.timestamp) : undefined,
        etag: entity.etag,
      };
    },
    async clear() {
      const iterator = (await getClient()).listEntities().byPage({ maxPageSize: pageSize });
      for await (const page of iterator) {
        await Promise.all(
          page.map(async (entity) => {
            if (entity.partitionKey && entity.rowKey) {
              await (await getClient()).deleteEntity(entity.partitionKey, entity.rowKey);
            }
          }),
        );
      }
    },
  };
};

export default driver;
