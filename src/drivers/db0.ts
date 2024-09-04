import type { Database } from "db0";
import { createError, defineDriver } from "./utils";

interface ResultSchema {
  rows: Array<{
    id: string;
    value: string;
    created_at: string;
    updated_at: string;
  }>;
}

type Dialect = "postgresql" | "mysql" | "sqlite";

export interface Db0DriverOptions {
  database: Database;
  dialect: Dialect;
  table?: string;
}

const DRIVER_NAME = "db0";
const DEFAULT_TABLE = "unstorage";

export default defineDriver((opts: Db0DriverOptions) => {
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
          createTablePromise = createTable(
            opts.dialect,
            opts.database,
            opts.table
          );
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
      const { rows } = await opts.database.sql<ResultSchema>`
        SELECT EXISTS (
          SELECT 1 FROM {${opts.table}} 
          WHERE id = ${key}
        ) AS value
      `;

      return rows?.[0]?.value == "1";
    }),
    getItem: withCreateTable(async (key) => {
      const { rows } = await opts.database.sql<ResultSchema>`
        SELECT value 
        FROM {${opts.table}} 
        WHERE id = ${key}
      `;

      return rows?.[0]?.value ?? null;
    }),
    setItem: withCreateTable(async (key, value) => {
      if (opts.dialect === "mysql") {
        await opts.database.sql`
          INSERT INTO {${opts.table}} (id, value) 
          VALUES (${key}, ${value}) 
          ON DUPLICATE KEY UPDATE value = ${value}
        `;

        return;
      }

      await opts.database.sql`
        INSERT INTO {${opts.table}} (id, value) 
        VALUES (${key}, ${value}) 
        ON CONFLICT(id) DO UPDATE 
        SET value = ${value}, updated_at = CURRENT_TIMESTAMP
      `;
    }),
    removeItem: withCreateTable(async (key) => {
      await opts.database.sql`
        DELETE FROM {${opts.table}} WHERE id=${key}
      `;
    }),
    getMeta: withCreateTable(async (key) => {
      const { rows } = await opts.database.sql<ResultSchema>`
        SELECT created_at, updated_at 
        FROM {${opts.table}} 
        WHERE id = ${key}
      `;

      return {
        birthtime: toDate(rows?.[0]?.created_at),
        mtime: toDate(rows?.[0]?.updated_at),
      };
    }),
    getKeys: withCreateTable(async (base = "") => {
      const { rows } = await opts.database.sql<ResultSchema>`
        SELECT id 
        FROM {${opts.table}} 
        WHERE id LIKE ${base + "%"}
      `;

      return rows?.map((r) => r.id);
    }),
    clear: withCreateTable(async () => {
      await opts.database.sql`
        DELETE FROM {${opts.table}}
      `;
    }),
  };
});

const createTable = async (
  dialect: Dialect,
  database: Database,
  name: string = DEFAULT_TABLE
) => {
  if (dialect === "sqlite") {
    await database.sql`
      CREATE TABLE IF NOT EXISTS {${name}} (
        id TEXT PRIMARY KEY, 
        value TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP, 
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;

    return;
  }

  if (dialect === "postgresql") {
    await database.sql`
      CREATE TABLE IF NOT EXISTS {${name}} (
        id VARCHAR(255) NOT NULL PRIMARY KEY, 
        value TEXT, 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    return;
  }

  if (dialect === "mysql") {
    await database.sql`
      CREATE TABLE IF NOT EXISTS {${name}} (
        id VARCHAR(255) NOT NULL PRIMARY KEY,
        value LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `;

    return;
  }

  throw createError(DRIVER_NAME, `Unknown dialect: ${dialect}`);
};

const toDate = (timestamp: string | undefined): Date | undefined => {
  return timestamp ? new Date(timestamp) : undefined;
};
