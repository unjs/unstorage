import basex from "base-x";
import { TablesDB } from "node-appwrite";
import type {
  AppwriteClientOptions,
  AppwriteStorageKeyOptions,
  RequireAllOrNone,
} from "../../src/drivers/utils/appwrite.ts";
import { type TestAPI } from "vitest";

function createRandomNumericString(length: number = 16) {
  const random = Math.floor(Math.random() * Math.pow(10, length));
  return random.toString().padStart(length, "0");
}

/**
 * Base62 encoding/decoding instance for Appwrite file/row IDs.
 * Uses characters 0-9, a-z, and A-Z for encoding.
 */
const base62 = basex(
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
);
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const ID_SEPARATOR = "_" as const;

export const keyOptions = {
  /**
   * Encodes a storage key to an Appwrite file ID using base62 encoding.
   * Splits the key by the separator, encodes each part, and joins with underscore.
   *
   * @param key - The storage key to encode
   * @param keySeparator - The separator character used in key paths
   * @returns The encoded file ID
   * @example
   * ```typescript
   * encodeKey("path/to/file", "/") // returns "23B5LG_7KL_1Shkqh"
   * ```
   */
  encodeKey(key, keySeparator) {
    return key
      .split(keySeparator)
      .map((part) => {
        return base62.encode(textEncoder.encode(part));
      })
      .join(ID_SEPARATOR);
  },
  /**
   * Decodes an Appwrite file ID back to a storage key using base62 decoding.
   * Splits the file ID by underscore, decodes each part, and joins with the original separator.
   *
   * @param fileId - The file ID to decode
   * @param keySeparator - The separator character used in key paths
   * @returns The decoded storage key
   * @example
   * ```typescript
   * decodeKey("23B5LG_7KL_1Shkqh", "/") // returns "path/to/file"
   * ```
   */
  decodeKey(fileId, keySeparator) {
    return fileId
      .split(ID_SEPARATOR)
      .map((part) => {
        return textDecoder.decode(base62.decode(part));
      })
      .join(keySeparator);
  },
} satisfies AppwriteStorageKeyOptions;

export type DatabaseOptions = {
  databaseId: string;
};

type TablesDbOptions = DatabaseOptions & {
  tablesDb: TablesDB;
};

export type AppwriteColumn = {
  key: string;
  type:
    | "string"
    | "integer"
    | "float"
    | "boolean"
    | "datetime"
    | "relationship";
  size?: number;
  required?: boolean;
  default?: unknown;
  array?: boolean;
};

export type AppwriteIndex = {
  key: string;
  type: "key" | "fulltext" | "unique" | "spatial";
  attributes: [string, ...string[]];
  orders?: string[];
  lengths?: number[];
};

export type TableNameOptions = {
  tableName: string;
};

export type TableOptions = TableNameOptions & {
  tableId: string;
  columns: AppwriteColumn[];
  indexes?: AppwriteIndex[];
};

async function createTable(options: TablesDbOptions & TableOptions) {
  const table = await options.tablesDb.createTable({
    databaseId: options.databaseId,
    tableId: options.tableId,
    name: options.tableName,
    columns: options.columns,
    indexes: options.indexes,
  });
  return table.name;
}

export async function deleteTable(
  options: TablesDbOptions & { tableId: string }
) {
  await options.tablesDb.deleteTable({
    databaseId: options.databaseId,
    tableId: options.tableId,
  });
}

type CreateTestTableOptions = AppwriteClientOptions &
  DatabaseOptions &
  TableNameOptions &
  RequireAllOrNone<{
    keyColumn: AppwriteColumn;
    keyIndex: AppwriteIndex;
  }>;

/**
 * Provides a test table for Appwrite database testing.
 * This function creates a test table before tests run and removes it afterward.
 * It automatically generates a unique table ID and sets up the necessary columns and indexes.
 *
 * @param test - The Vitest test API instance for setting up before/after hooks
 * @param options - Configuration options for creating the test table
 * @param options.client - Appwrite client instance
 * @param options.databaseId - ID of the database where the table will be created
 * @param options.tableName - Name of the test table
 * @param options.keyColumn - Optional custom key column definition
 * @param options.keyIndex - Optional custom key index definition
 * @returns The generated table ID that can be used in tests
 * @see CreateTestTableOptions for detailed parameter descriptions
 */
export function provideTestTable(
  test: TestAPI,
  options: CreateTestTableOptions
) {
  const tableId = "unstorage-test-" + createRandomNumericString();

  const columns: AppwriteColumn[] = [
    {
      key: "value",
      type: "string",
      size: 4096,
    },
  ];
  if (options.keyColumn) {
    columns.push(options.keyColumn);
  }
  const indexes: AppwriteIndex[] = [];
  if (options.keyIndex) {
    indexes.push(options.keyIndex);
  }

  const tablesDb = new TablesDB(options.client);

  test.beforeAll(async () => {
    await createTable({
      tableId,
      tableName: options.tableName,
      tablesDb,
      databaseId: options.databaseId,
      columns,
      indexes,
    });
  });

  test.afterAll(async () => {
    await deleteTable({
      tablesDb,
      databaseId: options.databaseId,
      tableId,
    });
  });

  return tableId;
}
