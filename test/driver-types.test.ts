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
      const filePath = resolve(driversDir, file);
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
            filePath,
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
      // Filter errors to only those in the checked file itself
      const relPath = `dist/drivers/${file}`;
      const fileErrors = output.split("\n").filter((line: string) => line.startsWith(relPath));
      expect(fileErrors, fileErrors.join("\n")).toHaveLength(0);
    });
  }
});
