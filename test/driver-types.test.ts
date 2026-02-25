import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

const rootDir = resolve(import.meta.dirname, "..");
const dtsFile = resolve(rootDir, "dist/index.d.mts");
const tsgo = resolve(rootDir, "node_modules/.bin/tsgo");

describe.skipIf(!existsSync(dtsFile))("dist type declarations", () => {
  it("dist/index.d.mts", () => {
    let output = "";
    try {
      execFileSync(
        tsgo,
        [
          "--noEmit",
          "--ignoreConfig",
          "--module",
          "nodenext",
          "--moduleResolution",
          "nodenext",
          "--types",
          "",
          dtsFile,
        ],
        {
          cwd: rootDir,
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
    } catch (error: any) {
      output = error.stdout || error.stderr || "";
    }
    const errors = output
      .split("\n")
      .filter((line: string) => line.startsWith("dist/"));
    expect(errors, errors.join("\n")).toHaveLength(0);
  });
});
