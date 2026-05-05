import { createHash } from "node:crypto";
import type { Connector, Database } from "db0";
import { createError, type DriverFactory } from "./utils/index.ts";
import { checkCAS } from "./utils/cas.ts";

interface ResultSchema {
  rows: Array<{
    key: string;
    value: string;
    etag: string | null;
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

const kExperimentalWarning = "__unstorage_db0_experimental_warning__";

const computeEtag = (value: unknown): string => {
  const buf = Buffer.isBuffer(value)
    ? value
    : Buffer.from(typeof value === "string" ? value : String(value));
  return createHash("sha1").update(buf).digest("hex");
};

const driver: DriverFactory<DB0DriverOptions, Database<Connector<unknown>>> = (opts) => {
  opts.tableName = opts.tableName || DEFAULT_TABLE_NAME;

  let setupPromise: Promise<void> | undefined;
  let setupDone = false;
  const ensureTable = () => {
    if (setupDone) {
      return;
    }
    if (!setupPromise) {
      if (!(globalThis as any)[kExperimentalWarning]) {
        console.warn(
          "[unstorage]: Database driver is experimental and behavior may change in the future.",
        );
        (globalThis as any)[kExperimentalWarning] = true;
      }
      setupPromise = setupTable(opts).then(() => {
        setupDone = true;
        setupPromise = undefined;
      });
    }
    return setupPromise;
  };

  const isMysql = opts.database.dialect === "mysql";

  // Per-key in-process serialization for CAS writes. db0 has no portable
  // transaction primitive across connectors, so we serialize SELECT-then-write
  // sequences in-process. Cross-process correctness is not guaranteed.
  const writeLocks = new Map<string, Promise<void>>();
  const withLock = async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
    const previous = writeLocks.get(key) || Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>((r) => {
      release = r;
    });
    writeLocks.set(
      key,
      previous.then(() => next),
    );
    await previous;
    try {
      return await fn();
    } finally {
      release();
      if (writeLocks.get(key) === next) {
        writeLocks.delete(key);
      }
    }
  };

  const readState = async (
    key: string,
  ): Promise<{ exists: boolean; etag?: string }> => {
    const { rows } = isMysql
      ? await opts.database.sql<ResultSchema>
        /* sql */ `SELECT etag FROM {${opts.tableName}} WHERE \`key\` = ${key}`
      : await opts.database.sql<ResultSchema>
        /* sql */ `SELECT etag FROM {${opts.tableName}} WHERE key = ${key}`;
    const row = rows?.[0];
    if (!row) {
      return { exists: false };
    }
    return { exists: true, etag: row.etag ?? undefined };
  };

  const writeWithCAS = async (
    key: string,
    value: string | Buffer,
    column: "value" | "blob",
    casOpts: { ifMatch?: string; ifNoneMatch?: string },
  ): Promise<{ etag: string }> => {
    const newEtag = computeEtag(value);
    return withLock(key, async () => {
      const { exists, etag: currentEtag } = await readState(key);
      checkCAS(DRIVER_NAME, key, { exists, etag: currentEtag }, casOpts);
      const v = value as any;
      if (exists) {
        if (isMysql) {
          if (column === "value") {
            await opts.database.sql
            /* sql */ `UPDATE {${opts.tableName}} SET \`value\` = ${v}, etag = ${newEtag}, updated_at = CURRENT_TIMESTAMP WHERE \`key\` = ${key}`;
          } else {
            await opts.database.sql
            /* sql */ `UPDATE {${opts.tableName}} SET \`blob\` = ${v}, etag = ${newEtag}, updated_at = CURRENT_TIMESTAMP WHERE \`key\` = ${key}`;
          }
        } else {
          if (column === "value") {
            await opts.database.sql
            /* sql */ `UPDATE {${opts.tableName}} SET value = ${v}, etag = ${newEtag}, updated_at = CURRENT_TIMESTAMP WHERE key = ${key}`;
          } else {
            await opts.database.sql
            /* sql */ `UPDATE {${opts.tableName}} SET blob = ${v}, etag = ${newEtag}, updated_at = CURRENT_TIMESTAMP WHERE key = ${key}`;
          }
        }
      } else {
        if (isMysql) {
          if (column === "value") {
            await opts.database.sql
            /* sql */ `INSERT INTO {${opts.tableName}} (\`key\`, \`value\`, etag, created_at, updated_at) VALUES (${key}, ${v}, ${newEtag}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
          } else {
            await opts.database.sql
            /* sql */ `INSERT INTO {${opts.tableName}} (\`key\`, \`blob\`, etag, created_at, updated_at) VALUES (${key}, ${v}, ${newEtag}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
          }
        } else {
          if (column === "value") {
            await opts.database.sql
            /* sql */ `INSERT INTO {${opts.tableName}} (key, value, etag, created_at, updated_at) VALUES (${key}, ${v}, ${newEtag}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
          } else {
            await opts.database.sql
            /* sql */ `INSERT INTO {${opts.tableName}} (key, blob, etag, created_at, updated_at) VALUES (${key}, ${v}, ${newEtag}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
          }
        }
      }
      return { etag: newEtag };
    });
  };

  const hasRow = async (key: string): Promise<boolean> => {
    const { rows } = isMysql
      ? await opts.database.sql<ResultSchema>
        /* sql */ `SELECT EXISTS (SELECT 1 FROM {${opts.tableName}} WHERE \`key\` = ${key}) AS \`value\``
      : await opts.database.sql<ResultSchema>
        /* sql */ `SELECT EXISTS (SELECT 1 FROM {${opts.tableName}} WHERE key = ${key}) AS value`;
    return rows?.[0]?.value == "1";
  };

  return {
    name: DRIVER_NAME,
    flags: { cas: true },
    options: opts,
    getInstance: () => opts.database,
    async hasItem(key) {
      await ensureTable();
      return hasRow(key);
    },
    getItem: async (key) => {
      await ensureTable();
      const { rows } = isMysql
        ? await opts.database.sql<ResultSchema>
          /* sql */ `SELECT value FROM {${opts.tableName}} WHERE \`key\` = ${key}`
        : await opts.database.sql<ResultSchema>
          /* sql */ `SELECT value FROM {${opts.tableName}} WHERE key = ${key}`;
      return rows?.[0]?.value ?? null;
    },
    getItemRaw: async (key) => {
      await ensureTable();
      const { rows } = isMysql
        ? await opts.database.sql<ResultSchema>
          /* sql */ `SELECT \`blob\` as value FROM {${opts.tableName}} WHERE \`key\` = ${key}`
        : await opts.database.sql<ResultSchema>
          /* sql */ `SELECT blob as value FROM {${opts.tableName}} WHERE key = ${key}`;
      return rows?.[0]?.value ?? null;
    },
    setItem: async (key, value, tOptions) => {
      await ensureTable();
      const wantsCAS =
        tOptions?.ifMatch !== undefined || tOptions?.ifNoneMatch !== undefined;
      if (wantsCAS) {
        return writeWithCAS(key, value, "value", tOptions);
      }
      const etag = computeEtag(value);
      if (isMysql) {
        await opts.database.sql
        /* sql */ `INSERT INTO {${opts.tableName}} (\`key\`, \`value\`, etag, created_at, updated_at) VALUES (${key}, ${value}, ${etag}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE value = ${value}, etag = ${etag}, updated_at = CURRENT_TIMESTAMP`;
      } else {
        await opts.database.sql
        /* sql */ `INSERT INTO {${opts.tableName}} (key, value, etag, created_at, updated_at) VALUES (${key}, ${value}, ${etag}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = ${value}, etag = ${etag}, updated_at = CURRENT_TIMESTAMP`;
      }
    },
    async setItemRaw(key, value, tOptions) {
      await ensureTable();
      const wantsCAS =
        tOptions?.ifMatch !== undefined || tOptions?.ifNoneMatch !== undefined;
      if (wantsCAS) {
        const blob = isMysql ? (Buffer.from(value) as any) : value;
        return writeWithCAS(key, blob, "blob", tOptions);
      }
      const etag = computeEtag(value);
      if (isMysql) {
        const blob = Buffer.from(value) as any;
        await opts.database.sql
        /* sql */ `INSERT INTO {${opts.tableName}} (\`key\`, \`blob\`, etag, created_at, updated_at) VALUES (${key}, ${blob}, ${etag}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE \`blob\` = ${blob}, etag = ${etag}, updated_at = CURRENT_TIMESTAMP`;
      } else {
        await opts.database.sql
        /* sql */ `INSERT INTO {${opts.tableName}} (key, blob, etag, created_at, updated_at) VALUES (${key}, ${value}, ${etag}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET blob = ${value}, etag = ${etag}, updated_at = CURRENT_TIMESTAMP`;
      }
    },
    removeItem: async (key) => {
      await ensureTable();
      if (isMysql) {
        await opts.database.sql /* sql */ `DELETE FROM {${opts.tableName}} WHERE \`key\`=${key}`;
      } else {
        await opts.database.sql /* sql */ `DELETE FROM {${opts.tableName}} WHERE key=${key}`;
      }
    },
    getMeta: async (key) => {
      await ensureTable();
      const { rows } = isMysql
        ? await opts.database.sql<ResultSchema>
          /* sql */ `SELECT etag, created_at, updated_at FROM {${opts.tableName}} WHERE \`key\` = ${key}`
        : await opts.database.sql<ResultSchema>
          /* sql */ `SELECT etag, created_at, updated_at FROM {${opts.tableName}} WHERE key = ${key}`;

      const row = rows?.[0];
      return {
        birthtime: toDate(row?.created_at),
        mtime: toDate(row?.updated_at),
        etag: row?.etag ?? undefined,
      };
    },
    getKeys: async (base = "") => {
      await ensureTable();
      const { rows } = isMysql
        ? await opts.database.sql<ResultSchema>
          /* sql */ `SELECT \`key\` FROM {${opts.tableName}} WHERE \`key\` LIKE ${base + "%"}`
        : await opts.database.sql<ResultSchema>
          /* sql */ `SELECT key FROM {${opts.tableName}} WHERE key LIKE ${base + "%"}`;

      return rows?.map((r) => r.key);
    },
    clear: async () => {
      await ensureTable();
      await opts.database.sql /* sql */ `DELETE FROM {${opts.tableName}}`;
    },
    dispose: async () => {
      await opts.database.dispose();
    },
  };
};

/** Run database init/migration once */
async function setupTable(opts: DB0DriverOptions) {
  switch (opts.database.dialect) {
    case "sqlite":
    case "libsql": {
      await opts.database.sql /* sql */ `
      CREATE TABLE IF NOT EXISTS {${opts.tableName}} (
        key TEXT PRIMARY KEY,
        value TEXT,
        blob BLOB,
        etag TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;
      await addEtagColumn(opts, "TEXT");
      return;
    }
    case "postgresql": {
      await opts.database.sql /* sql */ `
      CREATE TABLE IF NOT EXISTS {${opts.tableName}} (
        key VARCHAR(255) NOT NULL PRIMARY KEY,
        value TEXT,
        blob BYTEA,
        etag VARCHAR(64),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
      await addEtagColumn(opts, "VARCHAR(64)");
      return;
    }
    case "mysql": {
      await opts.database.sql /* sql */ `
      CREATE TABLE IF NOT EXISTS {${opts.tableName}} (
        \`key\` VARCHAR(255) NOT NULL PRIMARY KEY,
        \`value\` LONGTEXT,
        \`blob\` BLOB,
        \`etag\` VARCHAR(64),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `;
      await addEtagColumn(opts, "VARCHAR(64)");
      return;
    }
    default: {
      throw createError(DRIVER_NAME, `unsuppoted SQL dialect: ${opts.database.dialect}`);
    }
  }
}

// Best-effort migration for tables created before the etag column existed.
// Existing rows will have NULL etag and `ifMatch:<etag>` will fail until they
// are rewritten — a soft-breaking change documented in the changelog.
async function addEtagColumn(opts: DB0DriverOptions, type: string): Promise<void> {
  try {
    if (opts.database.dialect === "mysql") {
      await opts.database.exec(
        `ALTER TABLE \`${opts.tableName}\` ADD COLUMN \`etag\` ${type}`,
      );
    } else {
      await opts.database.exec(
        `ALTER TABLE "${opts.tableName}" ADD COLUMN etag ${type}`,
      );
    }
  } catch {
    // Column already exists or dialect doesn't support IF NOT EXISTS for ALTER.
  }
}

function toDate(timestamp: string | undefined): Date | undefined {
  return timestamp ? new Date(timestamp) : undefined;
}

export default driver;
