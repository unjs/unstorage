import { describe, it, expect, afterEach } from "vitest";
import { resolve } from "node:path";
import { readFile } from "../../src/drivers/utils/node-fs.ts";
import { testDriver } from "./utils.ts";
import driver from "../../src/drivers/fs-lite.ts";
import { createStorage } from "../../src/storage.ts";

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

  describe("dataSuffix option", () => {
    const suffixDir = resolve(__dirname, "tmp/fs-lite-suffix");

    afterEach(async () => {
      const s = createStorage({
        driver: driver({ base: suffixDir, dataSuffix: ".data" }),
      });
      await s.clear();
      await s.dispose();
    });

    it("prevents file/directory collision with dataSuffix", async () => {
      const d = driver({ base: suffixDir, dataSuffix: ".data" });
      const storage = createStorage({ driver: d });

      // This is the key scenario: "foo" and "foo:bar" must coexist.
      // Without dataSuffix, "foo" creates a file at <base>/foo, but
      // "foo:bar" needs <base>/foo/ to be a directory -> ENOTDIR.
      await storage.setItem("foo", "value_foo");
      await storage.setItem("foo:bar", "value_foo_bar");

      expect(await storage.getItem("foo")).toBe("value_foo");
      expect(await storage.getItem("foo:bar")).toBe("value_foo_bar");

      // Verify on-disk layout uses suffix
      expect(await readFile(resolve(suffixDir, "foo.data"), "utf8")).toBe(
        "value_foo",
      );
      expect(
        await readFile(resolve(suffixDir, "foo/bar.data"), "utf8"),
      ).toBe("value_foo_bar");

      // getKeys should return clean keys without the suffix
      const keys = (await storage.getKeys()).sort();
      expect(keys).toEqual(["foo", "foo:bar"]);

      await storage.dispose();
    });

    it("runs standard driver tests with dataSuffix", async () => {
      const d = driver({ base: suffixDir, dataSuffix: ".data" });
      const storage = createStorage({ driver: d });

      await storage.setItem("s1:a", "test_data");
      expect(await storage.hasItem("s1:a")).toBe(true);
      expect(await storage.getItem("s1:a")).toBe("test_data");

      await storage.removeItem("s1:a");
      expect(await storage.hasItem("s1:a")).toBe(false);

      await storage.dispose();
    });
  });
});
