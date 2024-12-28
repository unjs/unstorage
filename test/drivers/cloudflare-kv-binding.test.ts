/// <reference types="@cloudflare/workers-types" />
import { describe, expect, test, afterAll } from "vitest";
import { createStorage, snapshot } from "../../src";
import CloudflareKVBinding from "../../src/drivers/cloudflare-kv-binding";
import { testDriver } from "./utils";
import { getPlatformProxy } from "wrangler";

describe("drivers: cloudflare-kv", async () => {
  const cfProxy = await getPlatformProxy();
  (globalThis as any).__env__ = cfProxy.env;
  afterAll(async () => {
    (globalThis as any).__env__ = undefined;
    await cfProxy.dispose();
  });
  testDriver({
    driver: CloudflareKVBinding({ base: "base" }),
    async additionalTests(ctx) {
      test("snapshot", async () => {
        await ctx.storage.setItem("s1:a", "test_data");
        await ctx.storage.setItem("s2:a", "test_data");
        await ctx.storage.setItem("s3:a", "test_data");

        const storage = createStorage({
          driver: CloudflareKVBinding({}),
        });
        expect(await snapshot(storage, "")).toMatchInlineSnapshot(`
          {
            "base:s1:a": "test_data",
            "base:s2:a": "test_data",
            "base:s3:a": "test_data",
          }
        `);
      });
    },
  });
});
