import { defineDriver } from "./utils";
import type { ExecutedQuery } from "@planetscale/database";
import { connect } from "@planetscale/database";
import { fetch } from "ofetch";

export interface PlanetscaleDriverOptions {
  url?: string;
  table?: string;
  cache?: boolean;
}

interface TableSchema {
  id: string;
  value: string;
  created_at: Date;
  updated_at: Date;
}

export default defineDriver((opts: PlanetscaleDriverOptions = {}) => {
  if (!opts.url)
    throw new Error("Database URL is required to use the Planetscale driver.");

  opts.table = opts.table || "storage";

  // `connect` configures a connection class rather than initiating a connection
  const c = connect({
    url: opts.url,
    fetch,
  });

  // this query will be lazily executed
  if (opts.cache) {
    c.execute("SET @@boost_cached_queries = true;");
  }

  return {
    hasItem: async (key) => {
      const res = await c.execute(
        `SELECT COUNT(id) from ${opts.table} WHERE id=:key;`,
        { key }
      );
      return res.size >= 0;
    },
    getItem: async (key) => {
      const res = await c.execute(
        `SELECT value from ${opts.table} WHERE id=:key;`,
        { key }
      );
      console.log({ key, res: res.rows[0] });
      return rows(res)[0]?.value ?? null;
    },
    setItem: async (key, value) => {
      await c.execute(
        `INSERT INTO ${opts.table} (id, value) VALUES (:key, :value) ON DUPLICATE KEY UPDATE value = :value;`,
        { key, value }
      );
    },
    removeItem: async (key) => {
      await c.execute(`DELETE FROM ${opts.table} WHERE id=:key;`, { key });
    },
    getMeta: async (key) => {
      const res = await c.execute(
        `SELECT created_at, updated_at from ${opts.table} WHERE id=:key;`,
        { key }
      );
      return {
        atime: rows(res)[0]?.created_at,
        mtime: rows(res)[0]?.updated_at,
      };
    },
    getKeys: async (base = "") => {
      const res = await c.execute(
        `SELECT id from ${opts.table} WHERE id LIKE :base;`,
        { base: `${base}%` }
      );
      return rows(res).map((r) => r.id);
    },
    clear: async () => {
      await c.execute(`DELETE FROM ${opts.table};`);
    },
  };
});

function rows(res: ExecutedQuery) {
  return (res.rows as TableSchema[]) || [];
}
