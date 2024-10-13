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
  table?: string;
}

const DRIVER_NAME = "db0";
const DEFAULT_TABLE = "unstorage";

export default defineDriver((opts: DB0DriverOptions) => {
  opts.table = opts.table || DEFAULT_TABLE;

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
          createTablePromise = createTable(opts.database, opts.table);
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
          SELECT 1 FROM {${opts.table}}
          WHERE key = ${key}
        ) AS value
      `;

      return rows?.[0]?.value == "1";
    }),
    getItem: withCreateTable(async (key) => {
      const { rows } = await opts.database.sql<ResultSchema>/* sql */ `
        SELECT value
        FROM {${opts.table}}
        WHERE key = ${key}
      `;

      return rows?.[0]?.value ?? null;
    }),
    setItem: withCreateTable(async (key, value) => {
      if (opts.database.dialect === "mysql") {
        await opts.database.sql/* sql */ `
          INSERT INTO {${opts.table}} (key, value)
          VALUES (${key}, ${value})
          ON DUPLICATE KEY UPDATE value = ${value}
        `;

        return;
      }

      await opts.database.sql/* sql */ `
        INSERT INTO {${opts.table}} (key, value)
        VALUES (${key}, ${value})
        ON CONFLICT(key) DO UPDATE
        SET value = ${value}, updated_at = CURRENT_TIMESTAMP
      `;
    }),
    removeItem: withCreateTable(async (key) => {
      await opts.database.sql/* sql */ `
        DELETE FROM {${opts.table}} WHERE key=${key}
      `;
    }),
    getMeta: withCreateTable(async (key) => {
      const { rows } = await opts.database.sql<ResultSchema>/* sql */ `
        SELECT created_at, updated_at
        FROM {${opts.table}}
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
        FROM {${opts.table}}
        WHERE key LIKE ${base + "%"}
      `;

      return rows?.map((r) => r.key);
    }),
    clear: withCreateTable(async () => {
      await opts.database.sql/* sql */ `
        DELETE FROM {${opts.table}}
      `;
    }),
  };
});

async function createTable(database: Database, name: string = DEFAULT_TABLE) {
  switch (database.dialect) {
    case "sqlite":
    case "libsql": {
      await database.sql/* sql */ `
      CREATE TABLE IF NOT EXISTS {${name}} (
        key TEXT PRIMARY KEY,
        value TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;
      return;
    }
    case "postgresql": {
      await database.sql/* sql */ `
      CREATE TABLE IF NOT EXISTS {${name}} (
        key VARCHAR(255) NOT NULL PRIMARY KEY,
        value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
      return;
    }
    case "mysql": {
      await database.sql/* sql */ `
      CREATE TABLE IF NOT EXISTS {${name}} (
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
        `unsuppoted SQL dialect: ${database.dialect}`
      );
    }
  }
}

function toDate(timestamp: string | undefined): Date | undefined {
  return timestamp ? new Date(timestamp) : undefined;
}
