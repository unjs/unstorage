import { afterAll, describe, expect, it } from "vitest";
import { createDatabase } from "db0";
import db0Driver from "../../src/drivers/db0";
import { testDriver } from "./utils";

const drivers = [
  {
    name: "sqlite",
    async getDB() {
      const sqlite = await import("db0/connectors/better-sqlite3").then(
        (m) => m.default
      );
      return createDatabase(sqlite({ name: ":memory:" }));
    },
  },
  {
    name: "libsql",
    async getDB() {
      const libSQL = await import("db0/connectors/libsql/node").then(
        (m) => m.default
      );
      return createDatabase(libSQL({ url: ":memory:" }));
    },
  },
  {
    name: "pglite",
    async getDB() {
      const pglite = await import("db0/connectors/pglite").then(
        (m) => m.default
      );
      return createDatabase(pglite());
    },
  },
];

for (const driver of drivers) {
  describe(`drivers: db0 - ${driver.name}`, async () => {
    const db = await driver.getDB();

    afterAll(async () => {
      await db.sql`DROP TABLE IF EXISTS unstorage`;
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
