import { describe } from "vitest";
import denoKvNodeDriver from "../../src/drivers/deno-kv-node.ts";
import { testDriver } from "./utils.ts";

describe("drivers: deno-kv-node", async () => {
  testDriver({
    driver: denoKvNodeDriver({
      path: ":memory:",
      base: Math.round(Math.random() * 1_000_000).toString(16),
    }),
  });
});
