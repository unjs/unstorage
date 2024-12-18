import { describe } from "vitest";
import { testDriver } from "./utils";
import vercelBlobDriver from "../../src/drivers/vercel-blob";

const token = process.env.VITE_VERCEL_BLOB_READ_WRITE_TOKEN;

describe.skipIf(!token)("drivers: vercel-blob", async () => {
  process.env.VERCEL_TEST_READ_WRITE_TOKEN = token;
  testDriver({
    driver: () =>
      vercelBlobDriver({
        access: "public",
        base: Math.round(Math.random() * 1_000_000).toString(16),
        envPrefix: "VERCEL_TEST",
      }),
  });
});
