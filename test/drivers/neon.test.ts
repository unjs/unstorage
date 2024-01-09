import { describe, it, expect, beforeAll, afterAll } from "vitest";

import driver from "../../src/drivers/neon";
import { testDriver } from "./utils";
import { promisify } from "util";

import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL || "";

const CREATE_FUNCTION_TRIGGER = `
CREATE OR REPLACE FUNCTION update_modified_column ()
	RETURNS TRIGGER
	AS $$
BEGIN
	NEW.updated_at = now();
	RETURN NEW;
END;
$$
LANGUAGE 'plpgsql';
`;

const CREATE_TABLE = `
CREATE TABLE unstorage_test (
	id varchar(255) NOT NULL PRIMARY KEY,
	value text,
	created_at TIMESTAMP DEFAULT NOW(),
	updated_at TIMESTAMP DEFAULT NOW()
);
`;

const CREATE_TRIGGER = `
CREATE TRIGGER update_storage_updated_at
	BEFORE UPDATE ON unstorage_test
	FOR EACH ROW
	EXECUTE PROCEDURE update_modified_column ();
`;

const DROP_TABLE = `
DROP TABLE unstorage_test;
`;

const DROP_FUNCTION_TRIGGER = `
DROP FUNCTION update_modified_column;
`;

describe("drivers: neon", () => {
  const sleep = promisify(setTimeout);

  beforeAll(async () => {
    const sql = neon(DATABASE_URL);

    await sql.transaction([
      sql(CREATE_FUNCTION_TRIGGER),
      sql(CREATE_TABLE),
      sql(CREATE_TRIGGER),
    ]);
  });

  afterAll(async () => {
    const sql = neon(DATABASE_URL);
    await sql(DROP_TABLE);
    await sql(DROP_FUNCTION_TRIGGER);
  });

  testDriver({
    driver: driver({
      url: DATABASE_URL,
      table: "unstorage_test",
      fetchConnectionCache: true,
    }),
    additionalTests: (ctx) => {
      it("should throw error if no connection string is provided", async () => {
        expect(() =>
          driver({
            table: "unstorage_test",
          }).getItem("")
        ).rejects.toThrowError(
          "[unstorage] [neon] Missing required option `url`."
        );
      });

      it("should throw error if no connection is established", async () => {
        expect(() =>
          driver({
            url: "postgresql://do-not-exist:5432",
            table: "unstorage_test",
          }).getItem("")
        ).rejects.toThrowError(
          "Database connection string format for `neon()` should be: postgresql://user:password@host.tld/dbname?option=value"
        );
      });

      it("should have different dates when an entry was updated", async () => {
        await ctx.storage.setItem("s1:a", "test_data");
        await sleep(100);
        await ctx.storage.setItem("s1:a", "updated_test_data");
        const result = await ctx.storage.getMeta("s1:a");
        expect(result.mtime).not.toBe(result.birthtime);
      });
    },
  });
});
