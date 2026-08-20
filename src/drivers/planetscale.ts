import { createHash } from "node:crypto";
import {
  createRequiredError,
  type DriverFactory,
  importLib,
  type LibImport,
  type DriverDependencies,
} from "./utils/index.ts";
import { checkCAS } from "./utils/cas.ts";
import type { ExecutedQuery, Connection } from "@planetscale/database";

export interface PlanetscaleDriverOptions {
  url?: string;
  table?: string;
  boostCache?: boolean;

  /**
   * Optionally provide the [`@planetscale/database`](https://www.npmjs.com/package/@planetscale/database)
   * library to avoid dynamically importing it.
   */
  lib?: LibImport<typeof import("@planetscale/database")>;
}

interface TableSchema {
  id: string;
  value: string;
  etag: string | null;
  created_at: Date;
  updated_at: Date;
}

export const DRIVER_DEPENDENCIES: DriverDependencies = {
  lib: { name: "@planetscale/database", version: "^1.19.0" },
};

const DRIVER_NAME = "planetscale";
const DEFAULT_TABLE_NAME = "storage";

const computeEtag = (value: unknown): string => {
  const buf = Buffer.isBuffer(value)
    ? value
    : Buffer.from(typeof value === "string" ? value : String(value));
  return createHash("sha1").update(buf).digest("hex");
};

const driver: DriverFactory<PlanetscaleDriverOptions, Promise<Connection>> = (opts = {}) => {
  const table = opts.table || DEFAULT_TABLE_NAME;

  let _connection: Promise<Connection> | undefined;
  const getConnection = () =>
    (_connection ??= (async () => {
      if (!opts.url) {
        throw createRequiredError(DRIVER_NAME, "url");
      }
      const { connect } = await importLib(
        DRIVER_NAME,
        "@planetscale/database",
        opts.lib,
        () => import("@planetscale/database"),
      );
      // `connect` configures a connection class rather than initiating a connection
      const connection = connect({
        url: opts.url,
        fetch,
      });
      if (opts.boostCache) {
        // This query will be executed in background
        connection.execute("SET @@boost_cached_queries = true;").catch((error) => {
          console.error("[unstorage] [planetscale] Failed to enable cached queries:", error);
        });
      }
      // Best-effort additive migration for tables created before the etag column.
      connection.execute(`ALTER TABLE ${table} ADD COLUMN etag VARCHAR(64);`).catch(() => {
        // Column already exists or table not yet created — safe to ignore.
      });
      return connection;
    })());

  // Per-key in-process serialization for CAS writes. @planetscale/database has
  // no portable transaction primitive across shards, so we serialize
  // SELECT-then-write sequences in-process. Cross-process correctness is not
  // guaranteed.
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

  const readState = async (key: string): Promise<{ exists: boolean; etag?: string }> => {
    const res = await (
      await getConnection()
    ).execute(`SELECT etag from ${table} WHERE id=:key;`, { key });
    const row = rows(res)[0];
    if (!row) {
      return { exists: false };
    }
    return { exists: true, etag: row.etag ?? undefined };
  };

  return {
    name: DRIVER_NAME,
    flags: { cas: true },
    options: { ...opts, table },
    getInstance: getConnection,
    hasItem: async (key) => {
      const res = await (
        await getConnection()
      ).execute(`SELECT EXISTS (SELECT 1 FROM ${table} WHERE id = :key) as value;`, { key });
      return rows<{ value: string }[]>(res)[0]?.value == "1";
    },
    getItem: async (key) => {
      const res = await (
        await getConnection()
      ).execute(`SELECT value from ${table} WHERE id=:key;`, {
        key,
      });
      return rows(res)[0]?.value ?? null;
    },
    setItem: async (key, value, tOptions) => {
      const wantsCAS = tOptions?.ifMatch !== undefined || tOptions?.ifNoneMatch !== undefined;
      if (wantsCAS) {
        return withLock(key, async () => {
          const connection = await getConnection();
          const { exists, etag: currentEtag } = await readState(key);
          checkCAS(DRIVER_NAME, key, { exists, etag: currentEtag }, tOptions);
          const newEtag = computeEtag(value);
          await (exists
            ? connection.execute(
                `UPDATE ${table} SET value = :value, etag = :etag WHERE id = :key;`,
                {
                  key,
                  value,
                  etag: newEtag,
                },
              )
            : connection.execute(
                `INSERT INTO ${table} (id, value, etag) VALUES (:key, :value, :etag);`,
                { key, value, etag: newEtag },
              ));
          return { etag: newEtag };
        });
      }
      const etag = computeEtag(value);
      await (
        await getConnection()
      ).execute(
        `INSERT INTO ${table} (id, value, etag) VALUES (:key, :value, :etag) ON DUPLICATE KEY UPDATE value = :value, etag = :etag;`,
        { key, value, etag },
      );
    },
    removeItem: async (key) => {
      await (await getConnection()).execute(`DELETE FROM ${table} WHERE id=:key;`, { key });
    },
    getMeta: async (key) => {
      const res = await (
        await getConnection()
      ).execute(`SELECT etag, created_at, updated_at from ${table} WHERE id=:key;`, { key });
      const row = rows(res)[0];
      return {
        birthtime: row?.created_at,
        mtime: row?.updated_at,
        etag: row?.etag ?? undefined,
      };
    },
    getKeys: async (base = "") => {
      const res = await (
        await getConnection()
      ).execute(`SELECT id from ${table} WHERE id LIKE :base;`, { base: `${base}%` });
      return rows(res).map((r) => r.id);
    },
    clear: async () => {
      await (await getConnection()).execute(`DELETE FROM ${table};`);
    },
  };
};

function rows<T = TableSchema[]>(res: ExecutedQuery) {
  return (res.rows as T) || [];
}

export default driver;
