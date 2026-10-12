/// <reference types="@cloudflare/workers-types" />
import { describe, expect, test, afterAll, vi } from "vitest";
import { createStorage, snapshot } from "../../src/index.ts";
import CloudflareKVBinding from "../../src/drivers/cloudflare-kv-binding.ts";
import { testDriver } from "./utils.ts";
import { getPlatformProxy } from "wrangler";

// Resolve the binding by name through the `cloudflare:workers` builtin module
const env = vi.hoisted(() => ({}) as Record<string, unknown>);
vi.mock("cloudflare:workers", () => ({ env }));

describe("drivers: cloudflare-kv", async () => {
  const cfProxy = await getPlatformProxy({ persist: false });
  env.STORAGE = cfProxy.env.STORAGE;
  afterAll(async () => {
    delete env.STORAGE;
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
