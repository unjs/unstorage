import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const rootDir = resolve(import.meta.dirname, "..");
const tsc = resolve(rootDir, "node_modules/.bin/tsc");
const fixture = "test/fixtures/cloudflare-types/bindings.ts";

// https://github.com/unjs/unstorage/issues/858
describe("cloudflare binding types", () => {
  it("accepts global and module workers-types bindings with the DOM lib loaded", () => {
    let output = "";
    try {
      execFileSync(tsc, ["-p", "test/fixtures/cloudflare-types/tsconfig.json"], {
        cwd: rootDir,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (error: any) {
      // Type errors exit with a status, anything else (e.g. a missing binary) must fail
      if (typeof error.status !== "number") throw error;
      output = error.stdout || error.stderr || "";
    }
    const errors = output.split("\n").filter((line: string) => line.startsWith(fixture));
    expect(errors, errors.join("\n")).toHaveLength(0);
  });
});
