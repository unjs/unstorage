import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { readdirSync, existsSync } from "node:fs";

const rootDir = resolve(import.meta.dirname, "..");
const driversDir = resolve(rootDir, "dist/drivers");
const tsgo = resolve(rootDir, "node_modules/.bin/tsgo");

const dtsFiles = existsSync(driversDir)
  ? readdirSync(driversDir).filter((f) => f.endsWith(".d.mts"))
  : [];

describe.skipIf(dtsFiles.length === 0)("dist/drivers type declarations", () => {
  for (const file of dtsFiles) {
    it(`${file}`, () => {
      execFileSync(tsgo, [
        "--noEmit",
        "--ignoreConfig",
        "--skipLibCheck",
        "--module",
        "nodenext",
        "--moduleResolution",
        "nodenext",
        resolve(driversDir, file),
      ], {
        cwd: rootDir,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
    });
  }
});
