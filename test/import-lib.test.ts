import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { importLib } from "../src/drivers/utils/index.ts";

const cwd = fileURLToPath(new URL("tmp/import-lib", import.meta.url));

async function writePackage(name: string, source: string) {
  const dir = join(cwd, "node_modules", name);
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "package.json"),
    JSON.stringify({ name, type: "module", exports: { ".": "./index.js" } }),
  );
  await writeFile(join(dir, "index.js"), source);
}

describe("importLib", () => {
  beforeAll(async () => {
    await rm(cwd, { recursive: true, force: true });
    await writePackage("unstorage-cwd-only", `export const source = "cwd";`);
    await writePackage("lru-cache", `export const source = "cwd";`);
    vi.spyOn(process, "cwd").mockReturnValue(cwd);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await rm(cwd, { recursive: true, force: true });
  });

  it("uses provided lib", async () => {
    const lib = { source: "lib" };
    expect(await importLib("test", "unstorage-cwd-only", lib)).toBe(lib);
    expect(await importLib("test", "unstorage-cwd-only", () => lib)).toBe(lib);
  });

  it("resolves from cwd", async () => {
    const lib = await importLib<{ source: string }>("test", "unstorage-cwd-only", undefined);
    expect(lib.source).toBe("cwd");
  });

  it("prefers cwd over unstorage dependencies", async () => {
    const lib = await importLib<{ source: string }>("test", "lru-cache", undefined);
    expect(lib.source).toBe("cwd");
  });

  it("falls back to importing from unstorage", async () => {
    const lib = await importLib<typeof import("chokidar")>("test", "chokidar", undefined);
    expect(lib.watch).toBeTypeOf("function");
  });

  it("throws when not resolvable", async () => {
    await expect(importLib("test", "unstorage-missing-lib", undefined)).rejects.toThrow(
      "[unstorage] [test] Cannot import `unstorage-missing-lib`.",
    );
  });
});
