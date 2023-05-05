import { describe, it } from "vitest";
// import driver from "../../src/drivers/vercel-kv";
import { testDriver } from "./utils";

// TODO: Only works locally with env. Mock upstash client to run in CI

const hasEnv = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

if (hasEnv) {
  describe("drivers: vercel-kv", async () => {
    const driver = await import("../../src/drivers/vercel-kv").then(
      (r) => r.default
    );
    testDriver({
      driver: driver({}),
    });
  });
} else {
  // TODO: vitest describe.skipIf has no effect!!
  describe("drivers: vercel-kv", () => {
    it.skip("", () => {});
  });
}
