import { describe } from "vitest";
import { testDriver } from "./utils";
import driver from "../../src/drivers/vercel-blob";

const token = process.env.VITE_VERCEL_BLOB_READ_WRITE_TOKEN;

describe.skipIf(!token)("drivers: vercel-blob", async () => {
  process.env.VERCEL_TEST_READ_WRITE_TOKEN = token;
  testDriver({
    driver: driver({ base: "test", envPrefix: "VERCEL_TEST" }),
  });
});
