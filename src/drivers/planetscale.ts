import { createRequiredError, type DriverFactory } from "./utils/index.ts";
import type { ExecutedQuery, Connection } from "@planetscale/database";
import { connect } from "@planetscale/database";

export interface PlanetscaleDriverOptions {
  url?: string;
  table?: string;
  boostCache?: boolean;
}

interface TableSchema {
  id: string;
  value: string;
  created_at: Date;
  updated_at: Date;
}

const DRIVER_NAME = "planetscale";

const driver: DriverFactory<PlanetscaleDriverOptions> = ((opts = {}) => {
  opts.table = opts.table || "storage";

  let _connection: Connection;
  const getConnection = () => {
    if (!_connection) {
      if (!opts.url) {
        throw createRequiredError(DRIVER_NAME, "url");
      }
      // `connect` configures a connection class rather than initiating a connection
      _connection = connect({
        url: opts.url,
        fetch,
      });
      if (opts.boostCache) {
        // This query will be executed in background
        _connection
          .execute("SET @@boost_cached_queries = true;")
          .catch((error) => {
            console.error(
              "[unstorage] [planetscale] Failed to enable cached queries:",
              error
            );
          });
      }
    }
    return _connection;
  };

  return {
    name: DRIVER_NAME,
    options: opts,
    getInstance: getConnection,
    hasItem: async (key) => {
      const res = await getConnection().execute(
        `SELECT EXISTS (SELECT 1 FROM ${opts.table} WHERE id = :key) as value;`,
        { key }
      );
      return rows<{ value: string }[]>(res)[0]?.value == "1";
    },
    getItem: async (key) => {
      const res = await getConnection().execute(
        `SELECT value from ${opts.table} WHERE id=:key;`,
        { key }
      );
      return rows(res)[0]?.value ?? null;
    },
    setItem: async (key, value) => {
      await getConnection().execute(
        `INSERT INTO ${opts.table} (id, value) VALUES (:key, :value) ON DUPLICATE KEY UPDATE value = :value;`,
        { key, value }
      );
    },
    removeItem: async (key) => {
      await getConnection().execute(
        `DELETE FROM ${opts.table} WHERE id=:key;`,
        { key }
      );
    },
    getMeta: async (key) => {
      const res = await getConnection().execute(
        `SELECT created_at, updated_at from ${opts.table} WHERE id=:key;`,
        { key }
      );
      return {
        birthtime: rows(res)[0]?.created_at,
        mtime: rows(res)[0]?.updated_at,
      };
    },
    getKeys: async (base = "") => {
      const res = await getConnection().execute(
        `SELECT id from ${opts.table} WHERE id LIKE :base;`,
        { base: `${base}%` }
      );
      return rows(res).map((r) => r.id);
    },
    clear: async () => {
      await getConnection().execute(`DELETE FROM ${opts.table};`);
    },
  };
});

function rows<T = TableSchema[]>(res: ExecutedQuery) {
  return (res.rows as T) || [];
}


export default driver;
