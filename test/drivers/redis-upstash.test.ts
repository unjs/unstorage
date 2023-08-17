import { describe } from "vitest";
import { testDriver } from "./utils";
import driver from "../../src/drivers/redis-upstash";

import "dotenv/config";

// TODO: Similarly to vercel KV, we could create an UnJS test database on the upstash free tier, or mock the client.
const hasEnv =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

describe.skipIf(!hasEnv)("drivers: redis-upstash", async () => {
  testDriver({
    driver: driver({}),
  });
});
