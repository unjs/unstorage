import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { chmod, stat } from "node:fs/promises";
import { readFile } from "../../src/drivers/utils/node-fs.ts";
import { testDriver } from "./utils.ts";
import driver from "../../src/drivers/fs-lite.ts";

describe("drivers: fs-lite", () => {
  const dir = resolve(__dirname, "tmp/fs-lite");

  testDriver({
    driver: driver({ base: dir }),
    additionalTests(ctx) {
      it("does not mutate input options", () => {
        const opts = { base: "./tmp/fs-lite-opts" };
        const instance = driver(opts);
        expect(opts).toEqual({ base: "./tmp/fs-lite-opts" });
        expect(instance.options?.base).toBe(resolve("./tmp/fs-lite-opts"));
      });
      it("check filesystem", async () => {
        await ctx.storage.setItem("s1:a", "test_data");
        expect(await readFile(resolve(dir, "s1/a"), "utf8")).toBe("test_data");
      });
      it("writes in place unless atomic is enabled", async () => {
        await ctx.storage.setItem("inplace:key", "original");
        const filePath = resolve(dir, "inplace/key");
        const before = (await stat(filePath)).ino;
        await ctx.storage.setItem("inplace:key", "overwritten");
        expect((await stat(filePath)).ino).toBe(before);
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

describe("drivers: fs-lite (atomic)", () => {
  const dir = resolve(__dirname, "tmp/fs-lite-atomic");

  testDriver({
    driver: driver({ base: dir, atomic: true }),
    additionalTests(ctx) {
      it("reads concurrent with a write never observe a truncated value", async () => {
        const size = 256 * 1024;
        const a = new Uint8Array(size).fill(0xaa);
        const b = new Uint8Array(size).fill(0xbb);
        await ctx.storage.setItemRaw("atomic:key", a);
        for (let i = 0; i < 20; i++) {
          const [, ...reads] = await Promise.all([
            ctx.storage.setItemRaw("atomic:key", i % 2 === 0 ? b : a),
            ctx.storage.getItemRaw("atomic:key"),
            ctx.storage.getItemRaw("atomic:key"),
            ctx.storage.getItemRaw("atomic:key"),
          ]);
          for (const read of reads) {
            const bytes = read as Uint8Array;
            expect(bytes.length).toBe(size);
            const first = bytes[0];
            expect(first === 0xaa || first === 0xbb).toBe(true);
            expect(bytes.every((byte) => byte === first)).toBe(true);
          }
        }
      });

      it("getKeys never observes in-progress temp files", async () => {
        const size = 256 * 1024;
        const value = new Uint8Array(size).fill(0xaa);
        for (let i = 0; i < 20; i++) {
          const [, keys] = await Promise.all([
            ctx.storage.setItemRaw("tmp:key", value),
            ctx.driver.getKeys("", {}),
          ]);
          expect(keys.every((key) => !key.includes("unstorage-tmp"))).toBe(true);
        }
      });

      it("writes keys too long to carry a temp suffix", async () => {
        // The temp file name must not scale with the key, or long keys hit ENAMETOOLONG.
        const key = "long:" + "k".repeat(220);
        await ctx.storage.setItem(key, "value");
        expect(await ctx.storage.getItem(key)).toBe("value");
      });

      it.skipIf(process.platform === "win32")(
        "preserves file permissions when overwriting",
        async () => {
          await ctx.storage.setItem("perm:key", "original");
          const filePath = resolve(dir, "perm/key");
          await chmod(filePath, 0o600);
          await ctx.storage.setItem("perm:key", "overwritten");
          expect((await stat(filePath)).mode & 0o777).toBe(0o600);
        },
      );
    },
  });
});
