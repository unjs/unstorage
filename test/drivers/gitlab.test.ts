import { describe, it, expect } from "vitest";

import { createStorage, snapshot, restoreSnapshot } from "../../src";

import driver from "../../src/drivers/gitlab";
// import { testDriver } from "./utils";

const config = {
  repo: "ManUtopiK/test-unstorage-gitlab",
  headers: {
    // "PRIVATE-TOKEN": "YOUR_PRIVATE_TOKEN",
    // Authorization: "Bearer YOUR_OAUTH_TOKEN",
  },
};

const data = {
  "README.md": `# test-unstorage-gitlab

This repository is only used for testing https://unstorage.unjs.io with gitlab.`,
  "content:dir:file2.md": "# File 2",
  "content:file1.md": "# File 1",
};

describe("drivers: gitlab", () => {
  it("mount/unmount", async () => {
    const storage = createStorage().mount("/mnt", driver(config));
    await restoreSnapshot(storage, data, "mnt");
    expect(await snapshot(storage, "/mnt")).toMatchObject(data);
  });

  it("get keys", async () => {
    const storage = createStorage().mount("/mnt", driver(config));
    const keys = await storage.getKeys();
    expect(keys).toMatchObject([
      "mnt:README.md",
      "mnt:content:dir:file2.md",
      "mnt:content:file1.md",
    ]);
  });

  it("get keys of path /content/dir", async () => {
    const storage = createStorage().mount(
      "/mnt",
      driver({
        ...config,
        base: "content/dir",
      })
    );
    const keys = await storage.getKeys();
    expect(keys).toMatchObject(["mnt:content:dir:file2.md"]);
  });

  it("get keys of branch test", async () => {
    const storage = createStorage().mount(
      "/mnt",
      driver({
        ...config,
        branch: "test",
      })
    );
    const keys = await storage.getKeys();
    expect(keys).toMatchObject(["mnt:README.md", "mnt:content:file1.md"]);
  });

  it("get /content/dir/file2.md", async () => {
    const storage = createStorage().mount("/mnt", driver(config));
    const item = await storage.getItem("mnt:content:dir:file2.md");
    expect(item).toMatch(`# File 2`);
  });

  it("get /content/file1.md on branch test", async () => {
    const storage = createStorage().mount(
      "/mnt",
      driver({
        ...config,
        branch: "test",
      })
    );
    const item = await storage.getItem("mnt:content:file1.md");
    expect(item).toMatch(`# File 1 branch test`);
  });

  // Doesn't work. This driver is readonly for now.
  // testDriver({
  //   driver: driver(config),
  // });
});
