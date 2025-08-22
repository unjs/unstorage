/// <reference types="@cloudflare/workers-types" />
import { describe, expect, test, afterAll } from "vitest";
import CloudflareCacheBinding from "../../src/drivers/cloudflare-cache-binding";
import { testDriver } from "./utils";
import { getPlatformProxy } from "wrangler";

describe("drivers: cloudflare-cache-binding", async () => {
  const cfProxy = await getPlatformProxy();
  (globalThis as any).caches = cfProxy.caches;
  afterAll(async () => {
    (globalThis as any).caches = undefined;
    await cfProxy.dispose();
  });
  testDriver({
    driver: CloudflareCacheBinding({ base: "base" }),
    async additionalTests(ctx) {
      test.only("basic", async () => {
        console.log(cfProxy.caches.default.match.toString());
        await ctx.driver!.setItem!("key", "value", {});
        const value = await ctx.driver!.getItem!("key");
        expect(value).toBe("value");
      });
    },
  });
});
