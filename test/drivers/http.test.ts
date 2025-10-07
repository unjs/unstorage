import { describe, afterAll, expect, it } from "vitest";
import driver from "../../src/drivers/http.ts";
import { createStorage } from "../../src/index.ts";
import { createStorageServer } from "../../src/server.ts";
import { listen } from "listhen";
import { testDriver } from "./utils.ts";

describe("drivers: http", async () => {
  const remoteStorage = createStorage();
  const server = createStorageServer(remoteStorage, {
    authorize(req) {
      if (req.event.node.req.headers["x-global-header"] !== "1") {
        // console.log(req.key, req.type, req.event.node.req.headers);
        throw new Error("Missing global test header!");
      }
      if (
        req.key === "authorized" &&
        req.event.node.req.headers["x-auth-header"] !== "1"
      ) {
        // console.log(req.key, req.type, req.event.node.req.headers);
        throw new Error("Missing auth test header!");
      }
    },
  });
  const listener = await listen(server.handle, {
    port: { random: true },
  });

  afterAll(async () => {
    await listener.close();
  });

  testDriver({
    driver: driver({
      base: listener!.url,
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
