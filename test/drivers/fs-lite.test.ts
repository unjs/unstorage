import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { readFile } from "../../src/drivers/utils/node-fs.ts";
import { testDriver } from "./utils.ts";
import driver from "../../src/drivers/fs-lite.ts";

describe("drivers: fs-lite", () => {
  const dir = resolve(__dirname, "tmp/fs-lite");

  testDriver({
    driver: driver({ base: dir }),
    additionalTests(ctx) {
      it("check filesystem", async () => {
        await ctx.storage.setItem("s1:a", "test_data");
        expect(await readFile(resolve(dir, "s1/a"), "utf8")).toBe("test_data");
      });
      it("native meta", async () => {
        await ctx.storage.setItem("s1:a", "test_data");
        const meta = await ctx.storage.getMeta("/s1/a");
        expect(meta.atime?.constructor.name).toBe("Date");
        expect(meta.mtime?.constructor.name).toBe("Date");
        expect(meta.size).toBeGreaterThan(0);
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

      it("natively supports maxDepth in getKeys", async () => {
        await ctx.storage.setItem("file0.md", "boop");
        await ctx.storage.setItem("depth-test/file1.md", "boop");
        await ctx.storage.setItem("depth-test/depth0/file2.md", "boop");
        await ctx.storage.setItem("depth-test/depth0/depth1/file3.md", "boop");
        await ctx.storage.setItem("depth-test/depth0/depth1/file4.md", "boop");

        expect(
          (
            await ctx.driver.getKeys("", {
              maxDepth: 0,
            })
          ).sort(),
        ).toMatchObject(["file0.md"]);
        expect(
          (
            await ctx.driver.getKeys("", {
              maxDepth: 1,
            })
          ).sort(),
        ).toMatchObject(["depth-test/file1.md", "file0.md"]);
        expect(
          (
            await ctx.driver.getKeys("", {
              maxDepth: 2,
            })
          ).sort(),
        ).toMatchObject(["depth-test/depth0/file2.md", "depth-test/file1.md", "file0.md"]);
      });
    },
  });
});
