import {
  createRequiredError,
  type DriverFactory,
  importLib,
  type LibImport,
  type DriverDependencies,
} from "./utils/index.ts";
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
  created_at: Date;
  updated_at: Date;
}

export const DRIVER_DEPENDENCIES: DriverDependencies = {
  lib: { name: "@planetscale/database", version: "^1.19.0 || ^2.0.0" },
};

const DRIVER_NAME = "planetscale";
const DEFAULT_TABLE_NAME = "storage";

const driver: DriverFactory<PlanetscaleDriverOptions, Promise<Connection>> = (opts = {}) => {
  const table = opts.table || DEFAULT_TABLE_NAME;

  let _connection: Promise<Connection> | undefined;
  const getConnection = () =>
    (_connection ??= (async () => {
      if (!opts.url) {
        throw createRequiredError(DRIVER_NAME, "url");
      }
      const { connect } = await importLib(DRIVER_NAME, "@planetscale/database", opts.lib);
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
      return connection;
    })());

  return {
    name: DRIVER_NAME,
    options: { ...opts, table },
    getInstance: getConnection,
    hasItem: async (key) => {
      const res = await (
        await getConnection()
      ).execute(`SELECT EXISTS (SELECT 1 FROM ${table} WHERE id = ${escape(key)}) as value;`);
      return rows<{ value: string }[]>(res)[0]?.value == "1";
    },
    getItem: async (key) => {
      const res = await (
        await getConnection()
      ).execute(`SELECT value from ${table} WHERE id=${escape(key)};`);
      return rows(res)[0]?.value ?? null;
    },
    setItem: async (key, value) => {
      await (
        await getConnection()
      ).execute(
        `INSERT INTO ${table} (id, value) VALUES (${escape(key)}, ${escape(value)}) ON DUPLICATE KEY UPDATE value = ${escape(value)};`,
      );
    },
    removeItem: async (key) => {
      await (await getConnection()).execute(`DELETE FROM ${table} WHERE id=${escape(key)};`);
    },
    getMeta: async (key) => {
      const res = await (
        await getConnection()
      ).execute(`SELECT created_at, updated_at from ${table} WHERE id=${escape(key)};`);
      return {
        birthtime: rows(res)[0]?.created_at,
        mtime: rows(res)[0]?.updated_at,
      };
    },
    getKeys: async (base = "") => {
      const res = await (
        await getConnection()
      ).execute(`SELECT id from ${table} WHERE id LIKE ${escape(`${base}%`)};`);
      return rows(res).map((r) => r.id);
    },
    clear: async () => {
      await (await getConnection()).execute(`DELETE FROM ${table};`);
    },
  };
};

// `@planetscale/database` v2 no longer interpolates query parameters
// https://github.com/planetscale/database-js#query-parameters
const ESCAPE_CHARS: Record<string, string> = {
  "\0": "\\0",
  "\b": "\\b",
  "\t": "\\t",
  "\n": "\\n",
  "\r": "\\r",
  "\x1A": "\\Z",
  '"': '\\"',
  "'": "\\'",
  "\\": "\\\\",
};

function escape(value: string): string {
  // oxlint-disable-next-line no-control-regex
  return `'${String(value).replace(/[\0\b\t\n\r\x1A"'\\]/g, (char) => ESCAPE_CHARS[char]!)}'`;
}

function rows<T = TableSchema[]>(res: ExecutedQuery) {
  return (res.rows as T) || [];
}

export default driver;
