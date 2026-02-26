import { afterAll, describe, expect, it } from "vitest";
import { createDatabase } from "db0";
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
