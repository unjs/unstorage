import { createDatabase } from "db0";
import libSql from "db0/connectors/libsql/node";
import postgresql from "db0/connectors/postgresql";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe } from "vitest";
import db0Driver from "../../src/drivers/db0";
import { testDriver } from "./utils";

describe("drivers: db0 - libSQL", () => {
  const dbPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "tmp/db0/libsql/local.db"
  );
  if (existsSync(dbPath)) {
    unlinkSync(dbPath);
  }
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = createDatabase(
    libSql({
      url: `file:${dbPath}`,
    })
  );

  beforeAll(async () => {
    await db.sql`CREATE TABLE storage (id TEXT PRIMARY KEY, value TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`;
  });

  testDriver({
    driver: db0Driver({ database: db, dialect: "sqlite" }),
  });
});

describe.runIf(process.env.POSTGRESQL_URL)(
  "drivers: db0 - postgresql",
  async () => {
    const db = createDatabase(
      postgresql({
        url: process.env.POSTGRESQL_URL!,
      })
    );

    beforeAll(async () => {
      await db.sql`CREATE TABLE IF NOT EXISTS my_storage (id VARCHAR(255) NOT NULL PRIMARY KEY, value TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`;
    });

    afterAll(async () => {
      await db.sql`DROP TABLE IF EXISTS my_storage`;
    });

    testDriver({
      driver: db0Driver({
        database: db,
        dialect: "postgresql",
        table: "my_storage",
      }),
    });
  }
);
