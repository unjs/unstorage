/// <reference types="@cloudflare/workers-types" />
import { describe, test, expect, afterAll } from "vitest";
import { createStorage, snapshot } from "../../src";
import CloudflareR2Binding from "../../src/drivers/cloudflare-r2-binding";
import { testDriver } from "./utils";
import { getPlatformProxy } from "wrangler";

describe("drivers: cloudflare-r2-binding", async () => {
  const cfProxy = await getPlatformProxy();
  (globalThis as any).__env__ = cfProxy.env;
  afterAll(async () => {
    (globalThis as any).__env__ = undefined;
    await cfProxy.dispose();
  });

  testDriver({
    driver: CloudflareR2Binding({ base: "base" }),
    async additionalTests(ctx) {
      test("snapshot", async () => {
        await ctx.storage.setItem("s1:a", "test_data");
        await ctx.storage.setItem("s2:a", "test_data");
        await ctx.storage.setItem("s3:a", "test_data");

        const storage = createStorage({
          driver: CloudflareR2Binding({}),
        });

        const storageSnapshot = await snapshot(storage, "");

        expect(storageSnapshot).toMatchInlineSnapshot(`
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
