import { describe, it, expect } from "vitest";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { builtinDriverDependencies } from "../src/_drivers.ts";
import type { BuiltinDriverName } from "../src/_drivers.ts";

const driversDir = fileURLToPath(new URL("../src/drivers", import.meta.url));

const driverNames = (await readdir(driversDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name.replace(/\.ts$/, ""));

/** `uploadthing/server` -> `uploadthing`, `@azure/identity` -> `@azure/identity` */
function packageName(specifier: string): string {
  const segments = specifier.split("/");
  return specifier.startsWith("@") ? segments.slice(0, 2).join("/") : segments[0]!;
}

/** `opts.lib` / `options?.lib` / `lib` -> `lib` */
function optionName(expression: string): string {
  return expression.split(".").pop()!.replace("?", "");
}

describe("driver dependencies", () => {
  for (const name of driverNames) {
    it(name, async () => {
      const contents = await readFile(join(driversDir, `${name}.ts`), "utf8");
      const declared = builtinDriverDependencies[name as BuiltinDriverName] || {};

      const expected: Record<string, string> = {};

      // Direct `importLib(DRIVER_NAME, "<package>", <opts>.<option>, ...)` calls
      for (const [, specifier, expression] of contents.matchAll(
        /importLib\(\s*DRIVER_NAME,\s*"([^"]+)",\s*([\w.?]+),/g,
      )) {
        expected[optionName(expression!)] = packageName(specifier!);
      }

      // `@azure/identity` is imported on behalf of the driver by `utils/azure.ts`
      if (contents.includes("createDefaultAzureCredential(")) {
        expected.identityLib = "@azure/identity";
      }

      expect(
        Object.fromEntries(Object.entries(declared).map(([option, dep]) => [option, dep.name])),
      ).toMatchObject(expected);

      for (const dep of Object.values(declared)) {
        expect(dep.version, `${name}: missing version range`).toBeTruthy();
      }
    });
  }
});
