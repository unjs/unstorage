import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { readFile } from "../../src/drivers/utils/node-fs";
import { testDriver } from "./utils";
import driver from "../../src/drivers/fs-lite";

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

      it("supports depth in getKeys", async () => {
        await ctx.storage.setItem("depth-test/file0.md", "boop");
        await ctx.storage.setItem("depth-test/depth0/file1.md", "boop");
        await ctx.storage.setItem("depth-test/depth0/depth1/file2.md", "boop");
        await ctx.storage.setItem("depth-test/depth0/depth1/file3.md", "boop");

        const depth1Result = await ctx.storage.getKeys(undefined, {
          depth: 1,
        });
        const depth2Result = await ctx.storage.getKeys(undefined, {
          depth: 2,
        });

        expect(depth1Result).includes.members(["depth-test:file0.md"]);
        expect(depth1Result).not.include.members([
          "depth-test:depth0:file1.md",
          "depth-test:depth0:depth1:file2.md",
          "depth-test:depth0:depth1:file3.md",
        ]);
        expect(depth2Result).includes.members([
          "depth-test:file0.md",
          "depth-test:depth0:file1.md",
        ]);
        expect(depth2Result).not.include.members([
          "depth-test:depth0:depth1:file2.md",
          "depth-test:depth0:depth1:file3.md",
        ]);
      });
    },
  });
});
