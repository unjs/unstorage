import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const rootDir = resolve(import.meta.dirname, "..");
const tsc = resolve(rootDir, "node_modules/.bin/tsc");

// https://github.com/unjs/unstorage/issues/858
describe("cloudflare binding types", () => {
  it("accepts global and module workers-types bindings with the DOM lib loaded", () => {
    const result = spawnSync(tsc, ["-p", "test/fixtures/cloudflare-types/tsconfig.json"], {
      cwd: rootDir,
      encoding: "utf8",
    });
    if (result.error) throw result.error;
    // Any compiler error (not only ones in the fixture) fails the check
    expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
  });
});
