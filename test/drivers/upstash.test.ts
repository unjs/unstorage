import { describe } from "vitest";
import { testDriver } from "./utils";
import driver from "../../src/drivers/upstash";

const hasEnv =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

describe.skipIf(!hasEnv)("drivers: upstash", async () => {
  testDriver({
    driver: driver({
      url: process.env.VITE_UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    }),
  });
});
