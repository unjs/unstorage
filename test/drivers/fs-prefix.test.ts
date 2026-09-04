import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createStorage } from "../../src/storage.ts";
import { normalizeBaseKey } from "../../src/utils.ts";
import fsDriver from "../../src/drivers/fs.ts";
import fsLiteDriver from "../../src/drivers/fs-lite.ts";

describe.each(["fs", "fs-lite"])("%s prefix traversal", (name) => {
  let base: string;
  let storage: ReturnType<typeof createStorage>;

  beforeEach(async () => {
    base = await fs.mkdtemp(join(tmpdir(), "unstorage-prefix-"));
    storage = createStorage({ driver: (name === "fs" ? fsDriver : fsLiteDriver)({ base }) });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await storage.dispose();
    await fs.rm(base, { recursive: true, force: true });
  });

  async function write(path: string) {
    const target = join(base, path);
    await fs.mkdir(dirname(target), { recursive: true });
    await fs.writeFile(target, "value");
  }

  it("reads only the selected namespace and its ancestors", async () => {
    for (const tenant of ["tenant", "tenant-other", "other", "another"]) {
      for (const bucket of ["first", "second"]) {
        await write(`${tenant}/${bucket}/item`);
      }
    }
    const reads = vi.spyOn(fs, "readdir");
    const all = await storage.getKeys();
    expect(reads).toHaveBeenCalledTimes(13);

    reads.mockClear();
    expect((await storage.getKeys("tenant")).sort()).toEqual(
      all.filter((key) => key.startsWith("tenant:")).sort(),
    );
    expect(reads).toHaveBeenCalledTimes(4);

    reads.mockClear();
    expect(await storage.getKeys("missing")).toEqual([]);
    expect(reads).toHaveBeenCalledTimes(1);
  });

  it("preserves normalized keys and root-relative depth", async () => {
    const paths = ["root", "foo/item", "foo/nested/item", "foo/nested/deep/item", "foobar/item"];
    if (process.platform !== "win32") {
      paths.push(
        "foo:compound/item",
        "foo::repeated/item",
        "::/foo/item",
        "foo?query/deep/item",
        "foo/name\\slash",
      );
    }
    await Promise.all(paths.map(write));
    for (const maxDepth of [undefined, 0, 1, 2, 3]) {
      const all = await storage.getKeys("", { maxDepth });
      for (const prefix of [
        "foo",
        "/foo/",
        "foo:",
        "foo/nested",
        "foo/compound",
        "foo/repeated",
        "foobar",
      ]) {
        expect((await storage.getKeys(prefix, { maxDepth })).sort()).toEqual(
          all.filter((key) => key.startsWith(normalizeBaseKey(prefix))).sort(),
        );
      }
    }
  });

  it("preserves ancestor ignores and atomic-file exclusions", async () => {
    const ignored = join(base, "foo", "ignored");
    await storage.dispose();
    storage = createStorage({
      driver:
        name === "fs"
          ? fsDriver({ base, ignore: [ignored] })
          : fsLiteDriver({ base, ignore: (path) => path === ignored }),
    });
    await Promise.all([
      write("foo/kept/item"),
      write("foo/ignored/deep/item"),
      write("foo/.unstorage-tmp-abc"),
    ]);
    const reads = vi.spyOn(fs, "readdir");
    expect(await storage.getKeys("foo/ignored/deep")).toEqual([]);
    expect(reads.mock.calls.map(([path]) => String(path))).toEqual([base, join(base, "foo")]);
    expect(await storage.getKeys("foo")).toEqual(["foo:kept:item"]);
  });

  it("retains failures on the root and selected path but skips unrelated failures", async () => {
    await Promise.all([write("selected/item"), write("unrelated/item")]);
    const original = fs.readdir;
    let failingPath = base;
    const reads = vi.spyOn(fs, "readdir").mockImplementation(async (...args) => {
      if (String(args[0]) === failingPath) {
        throw Object.assign(new Error("denied"), { code: "EACCES" });
      }
      return original(...args);
    });
    await expect(storage.getKeys("selected")).rejects.toThrow();
    failingPath = join(base, "selected");
    await expect(storage.getKeys("selected")).rejects.toThrow();
    failingPath = join(base, "unrelated");
    reads.mockClear();
    expect(await storage.getKeys("selected")).toEqual(["selected:item"]);
    expect(reads.mock.calls.map(([path]) => String(path))).not.toContain(failingPath);
    await expect(storage.getKeys()).rejects.toThrow();
  });
});
