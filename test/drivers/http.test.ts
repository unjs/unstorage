import { describe, afterAll, expect, it } from "vitest";
import { serve } from "srvx";
import driver from "../../src/drivers/http.ts";
import { createStorage } from "../../src/index.ts";
import { createStorageHandler } from "../../src/server.ts";
import { testDriver } from "./utils.ts";

describe("drivers: http", async () => {
  const remoteStorage = createStorage();
  const server = createStorageHandler(remoteStorage, {
    authorize({ key, request }) {
      if (request.headers.get("x-global-header") !== "1") {
        // console.log(req.key, req.type, req.event.node.req.headers);
        throw new Error("Missing global test header!");
      }
      if (key === "authorized" && request.headers.get("x-auth-header") !== "1") {
        // console.log(req.key, req.type, req.event.node.req.headers);
        throw new Error("Missing auth test header!");
      }
    },
  });
  const listener = await serve({
    fetch: server,
    port: 0,
  });

  afterAll(async () => {
    await listener.close();
  });

  testDriver({
    driver: driver({
      base: listener!.url!,
      headers: { "x-global-header": "1" },
    }),
    async additionalTests(ctx) {
      it("custom headers", async () => {
        await ctx.storage.setItem("authorized", "test", {
          headers: { "x-auth-header": "1" },
        });
      });
      it("null item", async () => {
        await ctx.storage.setItem("nullItem", null);
        await ctx.storage.setItem("nullStringItem", "null");
        expect(await ctx.storage.getItem("nullItem")).toBeNull();
        expect(await ctx.storage.getItem("nanItem")).toBeNull();
        expect(await ctx.storage.getItem("nullStringItem")).toBeNull();
      });
    },
  });
});
