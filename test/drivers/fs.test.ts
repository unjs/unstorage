import { describe, it, expect, vi, afterEach } from "vitest";
import { resolve } from "node:path";
import { promises as fsPromises } from "node:fs";
import { chmod, stat } from "node:fs/promises";
import { readFile, writeFile, ensuredir } from "../../src/drivers/utils/node-fs.ts";
import { testDriver, type TestContext } from "./utils.ts";
import driver from "../../src/drivers/fs.ts";
import { createStorage } from "../../src/storage.ts";

describe("drivers: fs", () => {
  const dir = resolve(__dirname, "tmp/fs");

  testDriver({
    driver: driver({ base: dir }),
    supportsCAS: true,
    additionalTests(ctx) {
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
      it("CAS: same-size overwrites always produce a distinct etag", async () => {
        // The etag is (mtime, size, ino); filesystem timestamp granularity can be
        // coarser than two back-to-back writes, so this loops to catch a same-tick
        // collision that would let a stale `ifMatch` clobber a newer value.
        for (let i = 0; i < 50; i++) {
          const key = `cas-etag:${i}`;
          await ctx.storage.setItem(key, "v1");
          const first = (await ctx.storage.getMeta(key)).etag as string;
          const second = await ctx.storage.setItem(key, "v2", { ifMatch: first });
          expect(second).toMatchObject({ etag: expect.any(String) });
          expect((second as { etag: string }).etag).not.toBe(first);
        }
      });
      it("native meta", async () => {
        await ctx.storage.setItem("s1:a", "test_data");
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
        await ctx.storage.setItem("depth-test/file0.md", "boop");
        await ctx.storage.setItem("depth-test/depth0/file1.md", "boop");
        await ctx.storage.setItem("depth-test/depth0/depth1/file2.md", "boop");
        await ctx.storage.setItem("depth-test/depth0/depth1/file3.md", "boop");

        expect(
          (
            await ctx.driver.getKeys("", {
              maxDepth: 1,
            })
          ).sort(),
        ).toMatchObject(["depth-test/file0.md"]);

        expect(
          (
            await ctx.driver.getKeys("", {
              maxDepth: 2,
            })
          ).sort(),
        ).toMatchObject(["depth-test/depth0/file1.md", "depth-test/file0.md"]);
      });
    },
  });

  const ctx = {} as TestContext;

  it("excludes ignored folder in key listing", async () => {
    ctx.driver = driver({
      base: dir,
      ignore: [resolve(dir, "folder1")],
    });
    ctx.storage = createStorage({
      driver: ctx.driver,
    });
    await ctx.storage.setItem("folder1/file1", "boop");
    expect(await ctx.storage.getKeys()).toHaveLength(0);
  });

  it("excludes ignored file in key listing", async () => {
    ctx.driver = driver({
      base: dir,
      ignore: [resolve(dir, "folder1/file1")],
    });
    ctx.storage = createStorage({
      driver: ctx.driver,
    });
    await ctx.storage.setItem("folder1/file1", "boop");
    expect(await ctx.storage.getKeys()).toHaveLength(0);
  });

  it("ignores node_modules under dot-prefixed base path", async () => {
    const dotDir = resolve(__dirname, "tmp/.dot-prefix-test");
    ctx.driver = driver({ base: dotDir });
    ctx.storage = createStorage({ driver: ctx.driver });
    await ctx.storage.setItem("node_modules/pkg/index.js", "module");
    await ctx.storage.setItem("src/index.ts", "source");
    const keys = await ctx.storage.getKeys();
    expect(keys).toEqual(["src:index.ts"]);
  });

  afterEach(async () => {
    await ctx.storage?.clear();
    await ctx.storage?.dispose();
    await ctx.driver?.dispose?.();
  });
});

describe("drivers: fs (atomic)", () => {
  const dir = resolve(__dirname, "tmp/fs-atomic");

  testDriver({
    driver: driver({ base: dir, atomic: true }),
    supportsCAS: true,
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

      it("watch never observes in-progress temp files", async () => {
        const events: string[] = [];
        const unwatch = await ctx.storage.watch((event, key) => events.push(`${event} ${key}`));
        try {
          await ensuredir(dir);
          // Simulate the window in which an atomic write's temp file is visible on disk.
          await fsPromises.writeFile(resolve(dir, ".unstorage-tmp-abc-12345678-0"), "partial");
          await fsPromises.writeFile(resolve(dir, "watched_file"), "done");
          await new Promise((resolve) => setTimeout(resolve, 500));
        } finally {
          await unwatch();
        }
        expect(events).toContain("update watched_file");
        expect(events.every((event) => !event.includes("unstorage-tmp"))).toBe(true);
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

      it.skipIf(process.platform === "win32")(
        "rethrows non-ENOENT stat errors when overwriting",
        async () => {
          const filePath = resolve(dir, "stat-error/key");
          await writeFile(filePath, "original", "utf8", true);
          const statSpy = vi
            .spyOn(fsPromises, "stat")
            .mockRejectedValueOnce(
              Object.assign(new Error("permission denied"), { code: "EACCES" }),
            );
          try {
            await expect(writeFile(filePath, "overwritten", "utf8", true)).rejects.toThrow(
              "permission denied",
            );
          } finally {
            statSpy.mockRestore();
          }
          expect(await readFile(filePath, "utf8")).toBe("original");
        },
      );

      it("leaves no temp files behind", async () => {
        await ctx.storage.setItem("leftover:key", "value");
        const entries = await fsPromises.readdir(dir, { recursive: true });
        expect(entries.filter((entry) => entry.includes("unstorage-tmp"))).toEqual([]);
      });
    },
  });
});
