import { resolve } from "node:path";
import { describe, it, expect, vi } from "vitest";
import driver from "../src/drivers/fs";
import { writeFile } from "../src/drivers/utils/node-fs";
import { testDriver } from "./drivers/utils";

describe("encryption", () => {
  const dir = resolve(__dirname, "tmp/fs");

  // Example for fs driver
  testDriver({
    driver: driver({ base: dir }),
    contentEncryption: true,
    keyEncryption: true,
    additionalTests(ctx) {
      it("native meta", async () => {
        const meta = await ctx.storage.getMeta("/s1/a");
        expect(meta.atime?.constructor.name).toBe("Date");
        expect(meta.mtime?.constructor.name).toBe("Date");
        expect(meta.size).toBeGreaterThan(0);
      });
      it("watch filesystem", async () => {
        const watcher = vi.fn();
        await ctx.storage.watch(watcher);
        await writeFile(resolve(dir, "s1/random_file"), "random", "utf8");
        await new Promise((resolve) => setTimeout(resolve, 500));
        expect(watcher).toHaveBeenCalledWith("update", "s1:random_file");
      });

      it("allow double dots in filename: ", async () => {
        await ctx.storage.setItem("s1/te..st..js", "ok");
        expect(await ctx.storage.getItem("s1/te..st..js")).toBe("ok");
      });
    },
  });
});
