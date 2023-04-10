import { describe, it, expect } from "vitest";

import {
  createStorage,
  snapshot,
  restoreSnapshot,
} from "../../src";

import driver from "../../src/drivers/gitlab";
// import { testDriver } from "./utils";

const config = {
  repo: "YOUR_GITLAB_REPO",
  headers: {
    "PRIVATE-TOKEN": "YOUR_PRIVATE_TOKEN",
    // Authorization: "Bearer YOUR_OAUTH_TOKEN",
  },
};

const data = {
  "README.md": `# repo-vitest-nuxt-cms

Repository used for vitest tests`,
  "data.json": { foo: "bar" },
  "folder:foo.md": "bar",
};

describe("drivers: gitlab", () => {
  it("mount/unmount", async () => {
    const storage = createStorage().mount("/mnt", driver(config));
    await restoreSnapshot(storage, data, "mnt");
    expect(await snapshot(storage, "/mnt")).toMatchObject(data);
  });

  // Doesn't work. This driver is readonly for now.
  // testDriver({
  //   driver: driver(config),
  // });
});
