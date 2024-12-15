import { describe } from "vitest";
import vercelKVDriver from "../../src/drivers/vercel-kv";
import { testDriver } from "./utils";

const hasEnv = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

describe.skipIf(!hasEnv)("drivers: vercel-kv", async () => {
  testDriver({
    driver: () => vercelKVDriver({}),
  });
});
