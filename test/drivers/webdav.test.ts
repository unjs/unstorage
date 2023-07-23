import { describe, it, expect, vi } from "vitest";
import driver, { type WebdavEntry } from "../../src/drivers/webdav";
import { createStorage } from "../../src";

describe("drivers: github", () => {
  const storage = createStorage({
    driver: driver({
      serverURL: "https://nextcloud27.our-servers.de",
      pathPrefix: "/remote.php/dav/files/",
      username: "user",
      password: "demo123",
    }),
  });

  it("can read a repository files", async () => {
    const keys = await storage.getKeys();
    expect(keys.length).toBeGreaterThan(10);
  });

  it("can check for a file presence", async () => {
    const hasPkg = await storage.hasItem("Documents:Example.md");
    expect(hasPkg).toBe(true);
  });

  it("can read a markdown file content", async () => {
    const pkg = (await storage.getItem("Documents:Example.md")) as Record<
      string,
      WebdavEntry
    >;
    expect(pkg).toBeTruthy();
  });

  it("can read an item metadata", async () => {
    const pkgMeta = (await storage.getMeta("Documents:Example.md")) as {
      type: string;
      size: number;
      mime?: string;
      etag?: string;
    };
    expect(pkgMeta.type).toBe("file");
    expect(pkgMeta.mime).toBe("text/markdown");
    expect(pkgMeta.size).toBeTypeOf("number");
    expect(pkgMeta.etag).toBeTypeOf("string");
  });
});
