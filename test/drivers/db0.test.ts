import { createDatabase } from "db0";
import libSql from "db0/connectors/libsql/node";
import pglite from "db0/connectors/pglite";
import { afterAll, describe, expect } from "vitest";
import db0Driver from "../../src/drivers/db0";
import { testDriver } from "./utils";

describe("drivers: db0 - LibSQL", () => {
  const db = createDatabase(
    libSql({
      url: ":memory:",
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

describe("drivers: db0 - PGlite", async () => {
  const db = createDatabase(pglite());

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
});
