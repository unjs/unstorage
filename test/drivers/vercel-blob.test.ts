import { describe } from "vitest";
import { testDriver } from "./utils.ts";
import vercelBlobDriver from "../../src/drivers/vercel-blob.ts";

const token = process.env.VITE_VERCEL_BLOB_READ_WRITE_TOKEN;

describe.skipIf(!token)("drivers: vercel-blob (public)", async () => {
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

const privateToken = process.env.VITE_VERCEL_PRIVATE_BLOB_READ_WRITE_TOKEN;

describe.skipIf(!privateToken)("drivers: vercel-blob (private)", async () => {
  process.env.VERCEL_TEST_PRIVATE_READ_WRITE_TOKEN = privateToken;
  testDriver({
    driver: () =>
      vercelBlobDriver({
        access: "private",
        base: Math.round(Math.random() * 1_000_000).toString(16),
        envPrefix: "VERCEL_TEST_PRIVATE",
      }),
  });
});
