import { afterAll, describe, expect, it, vi } from "vitest";
import { createDatabase } from "db0";
import { createStorage } from "../../src/index.ts";
import db0Driver from "../../src/drivers/db0.ts";
import { testDriver } from "./utils.ts";

const drivers = [
  {
    name: "sqlite",
    async getDB() {
      const sqlite = await import("db0/connectors/node-sqlite").then((m) => m.default);
      return createDatabase(sqlite({ name: ":memory:" }));
    },
  },
  {
    name: "libsql",
    async getDB() {
      const libSQL = await import("db0/connectors/libsql/node").then((m) => m.default);
      return createDatabase(libSQL({ url: ":memory:" }));
    },
  },
  {
    name: "pglite",
    async getDB() {
      const pglite = await import("db0/connectors/pglite").then((m) => m.default);
      return createDatabase(pglite());
    },
  },
  // docker run -it --rm --name mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=unstorage -p 3306:3306 mysql
  // VITEST_MYSQL_URI=mysql://root:root@localhost/unstorage pnpm vitest test/drivers/db0.test.ts -t mysql
  {
    name: "mysql",
    enabled: !!process.env.VITEST_MYSQL_URI,
    async getDB() {
      const mysql = await import("db0/connectors/mysql2").then((m) => m.default);
      return createDatabase(
        mysql({
          uri: process.env.VITEST_MYSQL_URI,
        }),
      );
    },
  },
];

for (const driver of drivers) {
  describe.skipIf(driver.enabled === false)(`drivers: db0 - ${driver.name}`, async () => {
    const db = await driver.getDB();

    afterAll(async () => {
      const dbCleanup = await driver.getDB();
      await dbCleanup.sql`DROP TABLE IF EXISTS unstorage`;
      await dbCleanup.dispose();
    });

    testDriver({
      driver: () => db0Driver({ database: db }),
      additionalTests: (ctx) => {
        it("does not mutate input options", () => {
          const opts = { database: db };
          const instance = db0Driver(opts);
          expect(opts).toEqual({ database: db });
          expect(instance.options?.tableName).toBe("unstorage");
        });
        it("does not create the table when autoSetup is disabled", async () => {
          await ctx.storage.setItem("autosetup:test", "test_data");

          const sqlSpy = vi.spyOn(db, "sql");
          try {
            const storage = createStorage({
              driver: db0Driver({ database: db, autoSetup: false }),
            });

            expect(await storage.getItem("autosetup:test")).toBe("test_data");

            const queries = sqlSpy.mock.calls.map(([strings]) => strings.join(""));
            expect(sqlSpy).toHaveBeenCalled();
            expect(queries.join("\n")).not.toMatch(/\bCREATE\s+TABLE\b/i);
          } finally {
            sqlSpy.mockRestore();
          }
        });
        it("creates the table once when autoSetup is enabled", async () => {
          const tableName = "unstorage_auto_setup_enabled";
          await db.sql`DROP TABLE IF EXISTS {${tableName}}`;

          const sqlSpy = vi.spyOn(db, "sql");
          try {
            const storage = createStorage({
              driver: db0Driver({ database: db, tableName, autoSetup: true }),
            });

            expect(await storage.getItem("autosetup:test")).toBeNull();
            await storage.setItem("autosetup:test", "test_data");
            expect(await storage.getItem("autosetup:test")).toBe("test_data");

            const queries = sqlSpy.mock.calls.map(([strings]) => strings.join(""));
            expect(queries.filter((query) => /\bCREATE\s+TABLE\b/i.test(query))).toHaveLength(1);
          } finally {
            sqlSpy.mockRestore();
            await db.sql`DROP TABLE IF EXISTS {${tableName}}`;
          }
        });
        it("propagates the SQL error when autoSetup is disabled and the table is missing", async () => {
          const tableName = "unstorage_auto_setup_missing";
          await db.sql`DROP TABLE IF EXISTS {${tableName}}`;

          const executeSQL = db.sql;
          let sqlError: unknown;
          const sqlSpy = vi.spyOn(db, "sql").mockImplementation(async (strings, ...values) => {
            try {
              return await executeSQL(strings, ...values);
            } catch (error) {
              sqlError = error;
              throw error;
            }
          });
          try {
            const storage = createStorage({
              driver: db0Driver({ database: db, tableName, autoSetup: false }),
            });

            const read = storage.getItem("autosetup:test");
            await expect(read).rejects.toThrow(tableName);
            await expect(read).rejects.toBe(sqlError);
            expect(sqlSpy).toHaveBeenCalledTimes(1);
          } finally {
            sqlSpy.mockRestore();
            await db.sql`DROP TABLE IF EXISTS {${tableName}}`;
          }
        });
        it("meta", async () => {
          await ctx.storage.setItem("meta:test", "test_data");

          expect(await ctx.storage.getMeta("meta:test")).toMatchObject({
            birthtime: expect.any(Date),
            mtime: expect.any(Date),
          });
        });
      },
    });
  });
}
