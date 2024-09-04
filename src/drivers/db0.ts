import type { Database } from "db0";
import { Driver } from "../types";
import { defineDriver } from "./utils";

type Dialect = "postgresql" | "mysql" | "sqlite";

interface ResultSchema {
  rows: Array<{
    id: string;
    value: string;
    created_at: string;
    updated_at: string;
  }>;
}

export interface Db0DriverOptions {
  database: Database;
  dialect: Dialect;
  table?: string;
}

const DRIVER_NAME = "db0";

export default defineDriver((opts: Db0DriverOptions) => {
  opts.table = opts.table || "storage";

  const dialects: Partial<Record<Dialect, Partial<Driver>>> = {
    mysql: {
      setItem: async (key, value) => {
        await opts.database
          .sql<ResultSchema>`INSERT INTO {${opts.table}} (id, value) VALUES (${key}, ${value}) ON DUPLICATE KEY UPDATE value = ${value}`;
      },
    },
  };

  return {
    name: DRIVER_NAME,
    options: opts,
    getInstance: () => opts.database,
    hasItem: async (key) => {
      const { rows } = await opts.database
        .sql<ResultSchema>`SELECT EXISTS (SELECT 1 FROM {${opts.table}} WHERE id = ${key}) as value`;

      return rows?.[0]?.value == "1";
    },
    getItem: async (key) => {
      const { rows } = await opts.database
        .sql<ResultSchema>`SELECT value from {${opts.table}} WHERE id = ${key}`;

      return rows?.[0]?.value ?? null;
    },
    setItem: async (key, value) => {
      await opts.database
        .sql<ResultSchema>`INSERT INTO {${opts.table}} (id, value, updated_at) VALUES (${key}, ${value}, CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET value = ${value}, updated_at = CURRENT_TIMESTAMP`;
    },
    removeItem: async (key) => {
      await opts.database
        .sql<ResultSchema>`DELETE FROM {${opts.table}} WHERE id=${key}`;
    },
    getMeta: async (key) => {
      const { rows } = await opts.database
        .sql<ResultSchema>`SELECT created_at, updated_at from {${opts.table}} WHERE id = ${key}`;

      return {
        birthtime: toDate(rows?.[0]?.created_at),
        mtime: toDate(rows?.[0]?.updated_at),
      };
    },
    getKeys: async (base = "") => {
      const { rows } = await opts.database
        .sql<ResultSchema>`SELECT id from {${opts.table}} WHERE id LIKE ${base + "%"}`;

      return rows?.map((r) => r.id);
    },
    clear: async () => {
      await opts.database.sql<ResultSchema>`DELETE FROM {${opts.table}}`;
    },
    ...dialects[opts.dialect],
  };
});

const toDate = (timestamp: string | undefined): Date | undefined => {
  return timestamp ? new Date(timestamp) : undefined;
};
