import { describe } from "vitest";
import vercelKVDriver from "../../src/drivers/vercel-kv.ts";
import { testDriver } from "./utils.ts";

const hasEnv = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

describe.skipIf(!hasEnv)("drivers: vercel-kv", async () => {
  testDriver({
    driver: () => vercelKVDriver({}),
  });
});
