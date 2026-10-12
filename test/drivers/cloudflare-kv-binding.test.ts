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
      test("does not list or clear keys of sibling prefixes", async () => {
        const root = createStorage({ driver: CloudflareKVBinding({}) });
        await root.setItem("basement:a", "sibling");
        try {
          await ctx.storage.setItem("foo:a", "x");
          await ctx.storage.setItem("foobar:a", "x");

          expect(await ctx.storage.getKeys("foo")).toEqual(["foo:a"]);
          await ctx.driver.clear!("foo:", {});
          expect(await ctx.storage.getKeys()).toEqual(["foobar:a"]);

          expect(await ctx.storage.getKeys()).not.toContain("ment:a");

          await ctx.storage.clear();
          expect(await root.getItem("basement:a")).toBe("sibling");
        } finally {
          await root.removeItem("basement:a");
        }
      });
    },
  });
});
