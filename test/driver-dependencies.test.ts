import { describe, it, expect } from "vitest";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
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

/**
 * Collect the `importLib()` calls reachable from a driver entry, following relative imports
 * into the shared `drivers/utils` helpers (bundled as `dist/_chunks/*`) since drivers like the
 * azure ones delegate their `identityLib` import to `utils/azure.ts`.
 */
async function collectImports(
  entry: string,
  seen = new Set<string>(),
  imports: Record<string, string> = {},
): Promise<Record<string, string>> {
  if (seen.has(entry)) {
    return imports;
  }
  seen.add(entry);

  const contents = await readFile(entry, "utf8");

  // `importLib(<driver>, "<specifier>", <opts>.<option>, () => import("<specifier>"))`
  for (const [, specifier, expression] of contents.matchAll(
    /importLib\(\s*[\w.]+,\s*"([^"]+)",\s*([\w.?]+),/g,
  )) {
    imports[optionName(expression!)] = specifier!;
  }

  for (const [, specifier] of contents.matchAll(/(?:from|import)\s*\(?\s*"(\.[^"]+)"/g)) {
    await collectImports(resolve(dirname(entry), specifier!), seen, imports);
  }

  return imports;
}

describe("driver dependencies", () => {
  for (const name of driverNames) {
    it(name, async () => {
      const declared = builtinDriverDependencies[name as BuiltinDriverName] || {};
      const imports = await collectImports(join(driversDir, `${name}.ts`));

      // Every dynamically imported library has to be declared with the package name to
      // install and the exact specifier the driver imports.
      const expected = Object.fromEntries(
        Object.entries(imports).map(([option, specifier]) => [
          option,
          { name: packageName(specifier), import: specifier },
        ]),
      );

      expect(
        Object.fromEntries(
          Object.entries(declared).map(([option, dep]) => [
            option,
            { name: dep.name, import: dep.import ?? dep.name },
          ]),
        ),
      ).toMatchObject(expected);

      for (const dep of Object.values(declared)) {
        expect(dep.version, `${name}: missing version range`).toBeTruthy();
      }
    });
  }
});
