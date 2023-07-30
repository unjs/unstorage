import { describe, it, expect, vi } from "vitest";
import webdavDriver, { type WebdavFile } from "../../src/drivers/webdav";
import { createStorage } from "../../src";
import fs from "fs/promises";

describe("drivers: webdav", () => {
  const storage = createStorage({
    driver: webdavDriver({
      source: "https://nextcloud27.our-servers.de/remote.php/dav/files/user",
      username: "user",
      password: "demo123",
    }),
  });

  it("can read files from source", async () => {
    const keys = await storage.getKeys();
    expect(keys.length).toBeGreaterThan(10);
  });

  it("can check for a file presence", async () => {
    const hasResource = await storage.hasItem("Documents:Example.md");
    expect(hasResource).toBe(true);
  });

  it("can read a file", async () => {
    const content = await storage.getItem("Documents:Example.md");
    expect(content).toBeTruthy();
  });

  it("can read an item metadata", async () => {
    const meta = (await storage.getMeta(
      "Documents:Example.md"
    )) as WebdavFile["meta"];

    expect(meta.href).toBe("/remote.php/dav/files/user/Documents/Example.md");
    expect(meta.type).toBe("text/markdown");
    expect(meta.size).toBeTypeOf("number");
    expect(Boolean(meta.mtime?.getTime())).toBe(true);
    expect(meta.etag).toBeTypeOf("string");
  });

  //* Requires Authorization for write access:
  /*
  it("can make directory", async () => {
    await storage.setItem("Documents:New Directory", '', { type: 'directory' })
  });
  it("can write files to storage", async () => {
    let file = `README.md`;
    let utf8 = await fs.readFile(file, 'utf8')
    await storage.setItem("Documents:Deeply:Nested:Unstorage.md", utf8)
  });
  it("can delete resource", async () => {
    await storage.removeItem("Documents:Deeply")
  });
  */
});
