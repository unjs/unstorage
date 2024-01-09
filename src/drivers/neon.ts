import { createError, createRequiredError, defineDriver } from "./utils";
import { neon, NeonQueryFunction, neonConfig } from "@neondatabase/serverless";

export interface NeonDriverOptions {
  /**
   * The Neon Postgres database connection string.
   * @example "postgresql://user:password@host:port/database?sslmode=require"
   */
  url?: string;
  /**
   * The name of the table to use for storing data.
   * @default "unstorage"
   * @example "unstorage"
   */
  table?: string;
  /**
   * Whether to fetch connection cache or not.
   * @default false
   */
  fetchConnectionCache?: boolean;
}

const DRIVER_NAME = "neon";

export default defineDriver((opts: NeonDriverOptions = {}) => {
  opts.table = opts.table || "unstorage";
  neonConfig.fetchConnectionCache = opts.fetchConnectionCache || false;

  let _connection: NeonQueryFunction<false, false>;

  const getConnection = () => {
    if (!_connection) {
      if (!opts.url) {
        throw createRequiredError(DRIVER_NAME, "url");
      }
      _connection = neon(opts.url);
    }

    if (!_connection) {
      throw createError(DRIVER_NAME, "Database connection is not established");
    }
    return _connection;
  };

  return {
    name: DRIVER_NAME,
    options: opts,
    hasItem: async (key) => {
      const sql = getConnection();
      const query = `SELECT EXISTS (SELECT 1 FROM ${opts.table} WHERE id='${key}') as value;`;

      const res = await sql(query);
      return res[0]?.value == "1";
    },
    getItem: async (key) => {
      const sql = getConnection();
      const query = `SELECT value from ${opts.table} WHERE id='${key}';`;

      const res = await sql(query);

      return res[0]?.value ?? null;
    },
    setItem: async (key, value) => {
      const sql = getConnection();
      const query = `INSERT INTO ${opts.table} (id, value) VALUES ('${key}', '${value}') ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value;`;
      await sql(query);
    },
    removeItem: async (key) => {
      const sql = getConnection();
      const query = `DELETE FROM ${opts.table} WHERE id='${key}';`;
      await sql(query);
    },
    getMeta: async (key) => {
      const sql = getConnection();
      let query = `SELECT created_at, updated_at from ${opts.table} WHERE id='${key}';`;
      const res = await sql(query);

      return {
        birthtime: res[0]?.created_at,
        mtime: res[0]?.updated_at,
      };
    },
    getKeys: async (base = "") => {
      const sql = getConnection();
      let query = `SELECT id from ${opts.table}${
        base ? ` WHERE id LIKE '${base}%'` : ""
      };`;

      const res = await sql(query);

      return res.map((r: any) => r.id);
    },
    clear: async () => {
      const sql = getConnection();
      const query = `DELETE FROM ${opts.table};`;
      await sql(query);
    },
  };
});
