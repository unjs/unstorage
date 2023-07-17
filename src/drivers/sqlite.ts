import { defineDriver, createError } from "./utils";
import Sqlite, { Database } from "better-sqlite3";

const DRIVER_NAME = "sqlite";

export interface SqliteDriverOptions {
  path?: string;
  table?: string;
  timeout?: number;
  enableWAL?: boolean;
  readonly?: boolean;
  verbose?: (message?: unknown, ...additionalArgs: unknown[]) => void;
}

export default defineDriver((opts: SqliteDriverOptions = {}) => {
  const options: SqliteDriverOptions = {
    // defaults
    path: ":memory:",
    table: "storage",
    timeout: 5000,
    enableWAL: true,
    readonly: false,
    verbose: null,
    // overwrite with the user provided options
    ...opts,
  };

  let db: Database;
  const getDb = () => {
    if (!db) {
      try {
        db = new Sqlite(options.path, {
          readonly: options.readonly,
          timeout: options.timeout,
          verbose: options.verbose,
        });
      } catch (cause) {
        createError(DRIVER_NAME, "Failed to initiate the database driver.", {
          cause,
        });
      }

      try {
        db.prepare(
          `CREATE TABLE IF NOT EXISTS ${options.table} (
  id varchar(255) NOT NULL PRIMARY KEY,
  value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`
        ).run();
      } catch (cause) {
        createError(
          DRIVER_NAME,
          `Failed to initiate the ${options.table} table.`,
          { cause }
        );
      }

      if (options.enableWAL) {
        try {
          db.pragma("journal_mode = WAL");
        } catch (cause) {
          createError(DRIVER_NAME, "Failed to enable WAL mode.", { cause });
        }
      }
    }
    return db;
  };

  const hasItemStatement = getDb().prepare(`
    SELECT EXISTS (
      SELECT 1
      FROM ${options.table}
      WHERE id = :key
    ) as value;
  `);
  const getStatement = getDb().prepare(`
    SELECT value
    FROM ${options.table}
    WHERE id=:key;
  `);
  const metaStatement = getDb().prepare(`
    SELECT created_at, updated_at
    FROM ${options.table}
    WHERE id=:key;
  `);
  const setStatement = getDb().prepare(`
    INSERT INTO ${options.table} (id, value)
    VALUES (:key, :value)
    ON CONFLICT (id) DO
    UPDATE SET value = :value, updated_at = CURRENT_TIMESTAMP;
  `);
  const removeStatement = getDb().prepare(
    `DELETE FROM ${options.table} WHERE id = :key;`
  );
  const getKeysStatement = getDb().prepare(
    `SELECT id FROM ${options.table} WHERE id LIKE :base`
  );
  const clearStatement = getDb().prepare(
    `DELETE FROM ${options.table} WHERE id LIKE :base;`
  );

  return {
    name: DRIVER_NAME,
    options,
    hasItem: (key) => {
      try {
        return (
          (
            hasItemStatement.get({
              key,
            }) as { value: number }
          ).value > 0
        );
      } catch (cause) {
        createError(DRIVER_NAME, `Error retrieving ${key}`, { cause });
      }
    },
    getItem: (key) => {
      try {
        return (
          (
            getStatement.get({
              key,
            }) as { value: string }
          )?.value ?? null
        );
      } catch (cause) {
        createError(DRIVER_NAME, `Error retrieving ${key}`, { cause });
      }
    },
    // TODO: Experimental feature. To be implemented once it is stable.
    // getItems: (keys) => {},
    // TODO: Experimental feature. To be implemented once it is stable.
    // getItemRaw: (key) => {},
    setItem: (key, value) => {
      try {
        if (!value) removeStatement.run({ key });
        setStatement.run({
          key,
          value,
        });
      } catch (cause) {
        createError(DRIVER_NAME, `Error setting ${key}`, { cause });
      }
    },
    // TODO: Experimental feature. To be implemented once it is stable.
    // setItems: (keys) => {},
    // TODO: Experimental feature. To be implemented once it is stable.
    // setItemRaw: (key, value) => {},
    removeItem: (key, removeMeta = true) => {
      try {
        removeStatement.run({
          key,
        });
        if (removeMeta) {
          removeStatement.run({
            key: `${key}$`,
          });
        }
      } catch (cause) {
        createError(DRIVER_NAME, `Error removing ${key}`, { cause });
      }
    },
    getMeta: (key, opts = {}) => {
      try {
        // We always return the native metadata.
        const native = metaStatement.run({
          key,
        }) as { created_at: string; updated_at: string };

        const timestamps = {
          birthtime: native?.created_at,
          mtime: native?.updated_at,
        };

        if (opts && opts.nativeOnly) {
          return timestamps;
        }

        const meta = getStatement.run({
          key: `${key}$`,
        }) as { value: string };

        if (!meta.value) {
          return timestamps;
        }

        return {
          ...timestamps,
          meta: meta.value,
        };
      } catch (cause) {
        createError(DRIVER_NAME, `Error getting meta for ${key}`, { cause });
      }
    },
    setMeta: (key, opts?) => {
      try {
        if (!value) removeStatement.run({ key: `${key}$` });
        setStatement.run({
          key: `${key}$`,
          value,
        });
      } catch (cause) {
        createError(DRIVER_NAME, `Error setting meta for ${key}`, { cause });
      }
    },
    removeMeta: (key, opts?) => {
      try {
        return removeStatement.run({
          key: `${key}$`,
        });
      } catch (cause) {
        createError(DRIVER_NAME, `Error removing ${key}`, { cause });
      }
    },
    getKeys: (base = "") => {
      try {
        return (
          (getKeysStatement.all({ base: `${base}%` }) as { id: string }[]) ?? []
        )
          .map((row) => row.id)
          .filter((row) => !row.endsWith("$"));
      } catch (cause) {
        createError(DRIVER_NAME, `Error retrieving keys using base ${base}`, {
          cause,
        });
      }
    },
    clear: (base = "") => {
      try {
        return clearStatement.run({ base: `${base}%` });
      } catch (cause) {
        createError(DRIVER_NAME, `Error clearing the database`, { cause });
      }
    },
  };
});
