import { describe, it, expect, vi } from "vitest";
import { resolve } from "path";
import { readFile, writeFile, unlink } from "../../src/drivers/utils/node-fs";
import { testDriver } from "./utils";
import driver from "../../src/drivers/fs";
import { getSeparator } from "../../src";

describe("drivers: fs", () => {
  const dir = resolve(__dirname, "tmp/fs");

  testDriver({
    driver: driver({ base: dir }),
    additionalTests(ctx) {
      it("check filesystem", async () => {
        expect(await readFile(resolve(dir, "s1/a"), "utf8")).toBe("test_data");
      });
      it("native meta", async () => {
        const meta = await ctx.storage.getMeta("/s1/a");
        expect(meta.atime?.constructor.name).toBe("Date");
        expect(meta.mtime?.constructor.name).toBe("Date");
        expect(meta.size).toBeGreaterThan(0);
      });
      it("watch filesystem", async () => {
        const watcher = vi.fn();
        const dispose = await ctx.storage.watch(watcher);
        await writeFile(
          resolve(dir, "s1/random_file"),
          "random" + `${Math.random()}`,
          "utf8"
        );

        await new Promise((resolve) => setTimeout(resolve, 500));

        expect(watcher).toHaveBeenCalledWith(
          "update",
          `s1${getSeparator()}random_file`
        );

        await unlink(resolve(dir, "s1/random_file"));
        await dispose();
      });

      const invalidKeys = ["../foobar", "..:foobar", "../", "..:", ".."];
      for (const key of invalidKeys) {
        it("disallow path travesal: ", async () => {
          await expect(ctx.storage.getItem(key)).rejects.toThrow("Invalid key");
        });
      }

      it("allow double dots in filename: ", async () => {
        await ctx.storage.setItem("s1/te..st..js", "ok");
        expect(await ctx.storage.getItem("s1/te..st..js")).toBe("ok");
      });
    },
  });
});
