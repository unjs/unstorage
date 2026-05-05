import { createError, createRequiredError, type DriverFactory } from "./utils/index.ts";
import { CASMismatchError } from "./utils/cas.ts";
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

const driver: DriverFactory<AzureStorageTableOptions, TableClient> = (opts) => {
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
      throw createError(DRIVER_NAME, "`pageSize` exceeds the maximum allowed value of `1000`");
    }
    if (accountKey) {
      // AzureNamedKeyCredential is only available in Node.js runtime, not in browsers
      const credential = new AzureNamedKeyCredential(accountName, accountKey);
      client = new TableClient(
        `https://${accountName}.table.core.windows.net`,
        tableName,
        credential,
      );
    } else if (sasKey) {
      const credential = new AzureSASCredential(sasKey);
      client = new TableClient(
        `https://${accountName}.table.core.windows.net`,
        tableName,
        credential,
      );
    } else if (connectionString) {
      // fromConnectionString is only available in Node.js runtime, not in browsers
      client = TableClient.fromConnectionString(connectionString, tableName);
    } else {
      const credential = new DefaultAzureCredential();
      client = new TableClient(
        `https://${accountName}.table.core.windows.net`,
        tableName,
        credential,
      );
    }
    return client;
  };

  // CAS write path. Native ETag-based optimistic concurrency:
  //  - createEntity → 409 Conflict on existing rowKey       (ifNoneMatch:"*")
  //  - updateEntity(..., { etag: <etag|"*"> }) → 412 on miss  (ifMatch:<etag|*>)
  //  - ifNoneMatch:<etag> has no native equivalent; emulated as
  //    read+conditional-update (NOT atomic — a concurrent writer between the
  //    read and the update can slip through unnoticed).
  const setWithCAS = async (
    key: string,
    value: unknown,
    tOptions: { ifMatch?: string; ifNoneMatch?: string },
  ): Promise<{ etag: string }> => {
    const c = getClient();
    const entity: TableEntity = { partitionKey, rowKey: key, unstorageValue: value };
    const { ifMatch, ifNoneMatch } = tOptions;
    try {
      if (ifNoneMatch === "*" && ifMatch === undefined) {
        const r = await c.createEntity(entity);
        return { etag: r.etag as string };
      }
      if (ifMatch !== undefined && ifNoneMatch === undefined) {
        // SDK accepts "*" as wildcard match — same code path as exact etag.
        const r = await c.updateEntity(entity, "Replace", { etag: ifMatch });
        return { etag: r.etag as string };
      }
      if (ifNoneMatch !== undefined && ifMatch === undefined) {
        // Non-atomic emulation of ifNoneMatch:<etag>: read current, then
        // conditional update on the read etag. Race window is unavoidable
        // without server-side support.
        const cur = await c.getEntity(partitionKey, key).catch(() => null);
        if (cur && cur.etag === ifNoneMatch) {
          throw new CASMismatchError(DRIVER_NAME, key);
        }
        if (cur) {
          const r = await c.updateEntity(entity, "Replace", { etag: cur.etag });
          return { etag: r.etag as string };
        }
        const r = await c.createEntity(entity);
        return { etag: r.etag as string };
      }
      // Combined ifMatch + ifNoneMatch: ifMatch implies existence, so do the
      // conditional update and post-check the resulting etag against ifNoneMatch.
      if (ifMatch !== undefined && ifNoneMatch !== undefined) {
        if (ifMatch !== "*" && ifMatch === ifNoneMatch) {
          throw new CASMismatchError(DRIVER_NAME, key);
        }
        const cur = await c.getEntity(partitionKey, key).catch(() => null);
        if (!cur) throw new CASMismatchError(DRIVER_NAME, key);
        if (ifNoneMatch === "*" || cur.etag === ifNoneMatch) {
          throw new CASMismatchError(DRIVER_NAME, key);
        }
        const r = await c.updateEntity(entity, "Replace", { etag: ifMatch });
        return { etag: r.etag as string };
      }
      // Unreachable: caller filters wantsCAS before delegating here.
      const r = await c.upsertEntity(entity, "Replace");
      return { etag: (r as { etag?: string }).etag as string };
    } catch (err) {
      if (CASMismatchError.is(err)) throw err;
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 412 || status === 409) {
        throw new CASMismatchError(DRIVER_NAME, key);
      }
      throw err;
    }
  };

  return {
    name: DRIVER_NAME,
    flags: { cas: true },
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
    async setItem(key, value, tOptions) {
      if (tOptions?.ifMatch !== undefined || tOptions?.ifNoneMatch !== undefined) {
        return setWithCAS(key, value, tOptions);
      }
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
      const iterator = getClient().listEntities().byPage({ maxPageSize: pageSize });
      const keys: string[] = [];
      for await (const page of iterator) {
        const pageKeys = page.map((entity) => entity.rowKey).filter(Boolean) as string[];
        keys.push(...pageKeys);
      }
      return keys;
    },
    async getMeta(key) {
      const entity = await getClient().getEntity(partitionKey, key).catch(() => null);
      if (!entity) return null;
      return {
        mtime: entity.timestamp ? new Date(entity.timestamp) : undefined,
        etag: entity.etag,
      };
    },
    async clear() {
      const iterator = getClient().listEntities().byPage({ maxPageSize: pageSize });
      for await (const page of iterator) {
        await Promise.all(
          page.map(async (entity) => {
            if (entity.partitionKey && entity.rowKey) {
              await getClient().deleteEntity(entity.partitionKey, entity.rowKey);
            }
          }),
        );
      }
    },
  };
};

export default driver;
