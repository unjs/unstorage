import { createDatabase } from "db0";
import libSql from "db0/connectors/libsql/node";
import postgresql from "db0/connectors/postgresql";
import { afterAll, describe, expect } from "vitest";
import db0Driver from "../../src/drivers/db0";
import { testDriver } from "./utils";

describe("drivers: db0 - libSQL", () => {
  const db = createDatabase(
    libSql({
      url: `:memory:`,
    })
  );

  afterAll(async () => {
    await db.sql`DROP TABLE IF EXISTS unstorage`;
  });

  testDriver({
    driver: db0Driver({ database: db }),
    additionalTests: async (ctx) => {
      await ctx.storage.setItem("meta:test", "test_data");

      expect(await ctx.storage.getMeta("meta:test")).toMatchObject({
        birthtime: expect.any(Date),
        mtime: expect.any(Date),
      });
    },
  });
});

describe.runIf(process.env.POSTGRESQL_URL)(
  "drivers: db0 - PostgreSQL",
  async () => {
    const db = createDatabase(
      postgresql({
        url: process.env.POSTGRESQL_URL!,
      })
    );

    afterAll(async () => {
      await db.sql`DROP TABLE IF EXISTS custom_unstorage_table`;
    });

    testDriver({
      driver: db0Driver({
        database: db,
        table: "custom_unstorage_table",
      }),
      additionalTests: async (ctx) => {
        await ctx.storage.setItem("meta:test", "test_data");

        expect(await ctx.storage.getMeta("meta:test")).toMatchObject({
          birthtime: expect.any(Date),
          mtime: expect.any(Date),
        });
      },
    });
  }
);
