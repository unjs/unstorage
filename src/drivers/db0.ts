import type { Database } from "db0";
import { createError, defineDriver } from "./utils";

interface ResultSchema {
  rows: Array<{
    key: string;
    value: string;
    created_at: string;
    updated_at: string;
  }>;
}

export interface DB0DriverOptions {
  database: Database;
  tableName?: string;
}

const DRIVER_NAME = "db0";
const DEFAULT_TABLE_NAME = "unstorage";

export default defineDriver((opts: DB0DriverOptions) => {
  opts.tableName = opts.tableName || DEFAULT_TABLE_NAME;

  /**
   * This promise is used to ensure that only one table creation is attempted
   * at a time and that all queries are queued until the table is created.
   */
  let createTablePromise: Promise<void> | undefined;

  /**
   * Creates a wrapper around a query function that will automatically
   * try to create the database table when a query fails.
   */
  const withCreateTable = <TResult, TArgs extends unknown[]>(
    query: (...args: TArgs) => Promise<TResult>
  ) => {
    return async (...args: TArgs): Promise<TResult> => {
      if (createTablePromise === undefined) {
        try {
          return await query(...args);
        } catch {
          createTablePromise = createTable(opts);
        }
      }

      await createTablePromise;

      return await query(...args);
    };
  };

  return {
    name: DRIVER_NAME,
    options: opts,
    getInstance: () => opts.database,
    hasItem: withCreateTable(async (key) => {
      const { rows } = await opts.database.sql<ResultSchema>/* sql */ `
        SELECT EXISTS (
          SELECT 1 FROM {${opts.tableName}}
          WHERE key = ${key}
        ) AS value
      `;

      return rows?.[0]?.value == "1";
    }),
    getItem: withCreateTable(async (key) => {
      const { rows } = await opts.database.sql<ResultSchema>/* sql */ `
        SELECT value
        FROM {${opts.tableName}}
        WHERE key = ${key}
      `;

      return rows?.[0]?.value ?? null;
    }),
    setItem: withCreateTable(async (key, value) => {
      if (opts.database.dialect === "mysql") {
        await opts.database.sql/* sql */ `
          INSERT INTO {${opts.tableName}} (key, value)
          VALUES (${key}, ${value})
          ON DUPLICATE KEY UPDATE value = ${value}
        `;

        return;
      }

      await opts.database.sql/* sql */ `
        INSERT INTO {${opts.tableName}} (key, value)
        VALUES (${key}, ${value})
        ON CONFLICT(key) DO UPDATE
        SET value = ${value}, updated_at = CURRENT_TIMESTAMP
      `;
    }),
    removeItem: withCreateTable(async (key) => {
      await opts.database.sql/* sql */ `
        DELETE FROM {${opts.tableName}} WHERE key=${key}
      `;
    }),
    getMeta: withCreateTable(async (key) => {
      const { rows } = await opts.database.sql<ResultSchema>/* sql */ `
        SELECT created_at, updated_at
        FROM {${opts.tableName}}
        WHERE key = ${key}
      `;

      return {
        birthtime: toDate(rows?.[0]?.created_at),
        mtime: toDate(rows?.[0]?.updated_at),
      };
    }),
    getKeys: withCreateTable(async (base = "") => {
      const { rows } = await opts.database.sql<ResultSchema>/* sql */ `
        SELECT key
        FROM {${opts.tableName}}
        WHERE key LIKE ${base + "%"}
      `;

      return rows?.map((r) => r.key);
    }),
    clear: withCreateTable(async () => {
      await opts.database.sql/* sql */ `
        DELETE FROM {${opts.tableName}}
      `;
    }),
  };
});

async function createTable(opts: DB0DriverOptions) {
  switch (opts.database.dialect) {
    case "sqlite":
    case "libsql": {
      await opts.database.sql/* sql */ `
      CREATE TABLE IF NOT EXISTS {${opts.tableName}} (
        key TEXT PRIMARY KEY,
        value TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;
      return;
    }
    case "postgresql": {
      await opts.database.sql/* sql */ `
      CREATE TABLE IF NOT EXISTS {${opts.tableName}} (
        key VARCHAR(255) NOT NULL PRIMARY KEY,
        value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
      return;
    }
    case "mysql": {
      await opts.database.sql/* sql */ `
      CREATE TABLE IF NOT EXISTS {${opts.tableName}} (
        key VARCHAR(255) NOT NULL PRIMARY KEY,
        value LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `;
      return;
    }
    default: {
      throw createError(
        DRIVER_NAME,
        `unsuppoted SQL dialect: ${opts.database.dialect}`
      );
    }
  }
}

function toDate(timestamp: string | undefined): Date | undefined {
  return timestamp ? new Date(timestamp) : undefined;
}
