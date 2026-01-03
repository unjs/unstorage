import type { Driver, StorageMeta, StorageValue } from "../types.ts";
import { normalizeKey, defineDriver } from "./utils/index.ts";
import {
  callAppwriteApi,
  provideAppwriteClient,
  type AppwriteClientOptions,
  type AppwriteProjectOptions,
  type AppwriteStorageKeyOptions,
  type RequireAllOrNone,
} from "./utils/appwrite.ts";
import { Models as AppwriteModels, Query, TablesDB } from "node-appwrite";

export type AppwriteTablesDbAttributesOptions =
  RequireAllOrNone<AppwriteStorageKeyOptions> & {
    attributes?: {
      key?: "$id" | string;
      value?: "value" | string;
    };
  };

export type AppwriteTablesDbConfigurationOptions = (
  | AppwriteProjectOptions
  | AppwriteClientOptions
) &
  AppwriteTablesDbAttributesOptions & {
    databaseId: string;
    tableId: string;
  };

const DRIVER_NAME = "appwrite-tables-db";

export default defineDriver((options: AppwriteTablesDbConfigurationOptions) => {
  let tablesDB: TablesDB;

  const getInstance = () => {
    if (!tablesDB) {
      const client = provideAppwriteClient(options, DRIVER_NAME);
      tablesDB = new TablesDB(client);
    }

    return tablesDB;
  };

  const KEY_SEPARATOR = ":" as const;

  const rowIdAttribute = options.attributes?.key ?? "$id";
  const valueAttribute = options.attributes?.value ?? "value";

  const tryEncodeKey = (key: string) => {
    key = normalizeKey(key, KEY_SEPARATOR);
    return options.encodeKey?.(key, KEY_SEPARATOR) ?? key;
  };

  const tryDecodeKey = (rowId: string) => {
    return options.decodeKey?.(rowId, KEY_SEPARATOR) ?? rowId;
  };

  const encodeBase = (base: string | undefined) => {
    if (base) {
      return tryEncodeKey(base + KEY_SEPARATOR);
    }
  };

  const listRows = async (queries: string[] | undefined) => {
    const instance = getInstance();
    return await callAppwriteApi(
      async () => {
        return await instance.listRows({
          databaseId: options.databaseId,
          tableId: options.tableId,
          queries,
        });
      },
      {
        driverName: DRIVER_NAME,
      }
    );
  };

  const getRowAttributes = async <T extends string[]>(
    key: string,
    attributes: T
  ) => {
    const rowId = tryEncodeKey(key);
    const queries = [
      Query.equal(rowIdAttribute, rowId),
      Query.select(attributes),
    ];
    const rowList = await listRows(queries);
    type RowType = {
      [K in (typeof attributes)[number]]: AppwriteModels.DefaultRow[K];
    };

    const rows = rowList.rows as RowType[];
    return rows.at(0) || null;
  };

  const getRowValue = async (key: string) => {
    const row = await getRowAttributes(key, [valueAttribute] as const);
    const value = row?.[valueAttribute];
    if (!value) return null;
    return JSON.parse(value);
  };

  const getRowMeta = async (key: string) => {
    return await getRowAttributes(key, ["$createdAt", "$updatedAt"] as const);
  };

  const upsertRow = async <T>(key: string, value: T) => {
    const instance = getInstance();

    const rows = [
      {
        // $id: AppwriteID.unique(),
        [rowIdAttribute]: tryEncodeKey(key),
        [valueAttribute]: JSON.stringify(value),
      },
    ];

    await callAppwriteApi(
      async () => {
        return await instance.upsertRows({
          databaseId: options.databaseId,
          tableId: options.tableId,
          rows,
        });
      },
      {
        driverName: DRIVER_NAME,
      }
    );
  };

  const deleteRows = async (queries: string[] | undefined) => {
    return await callAppwriteApi(
      async () => {
        return await tablesDB.deleteRows({
          databaseId: options.databaseId,
          tableId: options.tableId,
          queries,
        });
      },
      {
        driverName: DRIVER_NAME,
        onNotFound() {
          return null;
        },
      }
    );
  };

  const deleteRow = async (key: string) => {
    const keys = [key].map((key) => tryEncodeKey(key));
    const queries = [Query.equal(rowIdAttribute, keys)];
    return await deleteRows(queries);
  };

  return {
    getInstance,

    flags: {
      maxDepth: false,
      ttl: false,
    },

    async hasItem(key): Promise<boolean> {
      const row = await getRowAttributes(key, [rowIdAttribute]);
      return null != row;
    },

    async getMeta(key): Promise<StorageMeta | null> {
      const row = await getRowMeta(key);
      if (!row) return null;
      return {
        atime: new Date(row.$createdAt),
        mtime: new Date(row.$updatedAt),
      };
    },

    async getItem(key): Promise<StorageValue> {
      const value = await getRowValue(key);
      if (!value) return null;
      return value;
    },

    async getKeys(base: string | undefined): Promise<string[]> {
      base = encodeBase(base);
      const baseQueries = base ? [Query.startsWith(rowIdAttribute, base)] : [];
      const queries = [Query.select([rowIdAttribute]), ...baseQueries];
      const { rows } = await listRows(queries);
      return rows.map((row) => {
        return tryDecodeKey(row[rowIdAttribute]);
      });
    },

    async setItem(key, value) {
      await upsertRow(key, value);
    },

    async removeItem(key) {
      await deleteRow(key);
    },

    async clear(base: string | undefined) {
      base = encodeBase(base);
      const queries = base
        ? [Query.startsWith(rowIdAttribute, base)]
        : undefined;
      await deleteRows(queries);
    },
  } satisfies Driver;
});
