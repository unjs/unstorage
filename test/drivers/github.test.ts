import { describe, it, expect, vi } from "vitest";
import driver from "../../src/drivers/github";
import { createStorage } from "../../src";

describe("drivers: github", () => {
  const storage = createStorage({
    driver: driver({ repo: "unjs/unstorage", branch: "main", dir: "/" }),
  });

  it("can read a repository files", async () => {
    const keys = await storage.getKeys();
    expect(keys.length).toBeGreaterThan(10);
  });

  it("can check for a file presence", async () => {
    const hasPkg = await storage.hasItem("package.json");
    expect(hasPkg).toBe(true);
  });

  it("can read a json file content", async () => {
    const pkg = (await storage.getItem("package.json")) as Record<
      string,
      unknown
    >;
    expect(pkg.name).toBe("unstorage");
  });

  it("can read an item metadata", async () => {
    const pkgMeta = (await storage.getMeta("package.json")) as {
      sha: string;
      mode: string;
      size: number;
    };
    expect(pkgMeta.sha.length > 0).toBe(true);
    expect(Number(pkgMeta.mode)).toBeGreaterThan(1000);
    expect(pkgMeta.size).toBeGreaterThan(1000);
  });
});
