import { describe } from "vitest";
import driver from "../../src/drivers/vercel-kv";
import { testDriver } from "./utils";

// TODO: Only works locally with env. Mock upstash client to run in CI

const hasEnv = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

describe.skipIf(!hasEnv)("drivers: vercel-kv", () => {
  testDriver({
    driver: driver({}),
  });
});
