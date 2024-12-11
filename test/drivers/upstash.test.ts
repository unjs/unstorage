import { describe } from "vitest";
import { testDriver } from "./utils";
import driver from "../../src/drivers/upstash";

const url = process.env.VITE_UPSTASH_REDIS_REST_URL;
const token = process.env.VITE_UPSTASH_REDIS_REST_TOKEN;

describe.skipIf(!url || !token)("drivers: upstash", async () => {
  process.env.UPSTASH_REDIS_REST_URL = url;
  process.env.UPSTASH_REDIS_REST_TOKEN = token;
  testDriver({
    driver: driver({
      base: Math.round(Math.random() * 1_000_000).toString(16),
    }),
  });
});
