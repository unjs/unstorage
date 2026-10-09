import { describe } from "vitest";
import { testDriver } from "./utils";

const hasEnv = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

// Lazy import: @vercel/kv's default export proxy throws on property access without env
const vercelKVDriver = hasEnv
  ? (await import("../../src/drivers/vercel-kv")).default
  : undefined;

describe.skipIf(!hasEnv)("drivers: vercel-kv", async () => {
  testDriver({
    driver: () => vercelKVDriver!({}),
  });
});
