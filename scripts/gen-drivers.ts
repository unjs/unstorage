import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findTypeExports } from "mlly";
import { camelCase, upperFirst } from "scule";
import type { DriverDependencies } from "../src/types.ts";

const driversDir = fileURLToPath(new URL("../src/drivers", import.meta.url));

const driversMetaFile = fileURLToPath(new URL("../src/_drivers.ts", import.meta.url));

const driverEntries: string[] = (await readdir(driversDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name);

const drivers: {
  name: string;
  safeName: string;
  names: string[];
  subpath: string;
  optionsTExport?: string;
  optionsTName?: string;
  dependencies?: DriverDependencies;
}[] = [];

for (const entry of driverEntries) {
  const name = entry.replace(/\.ts$/, "");
  const subpath = `unstorage/drivers/${name}`;
  const fullPath = join(driversDir, `${name}.ts`);

  const contents = await readFile(fullPath, "utf8");
  const optionsTExport = findTypeExports(contents).find((type) =>
    type.name?.endsWith("Options"),
  )?.name;

  const safeName = camelCase(name).replace(/kv/i, "KV").replace("localStorage", "localstorage");

  const names = [...new Set([name, safeName])];

  const optionsTName = upperFirst(safeName) + "Options";

  // Drivers only import their third-party libraries dynamically, so this is safe to load.
  const { DRIVER_DEPENDENCIES: dependencies } = contents.includes("DRIVER_DEPENDENCIES")
    ? await import(pathToFileURL(fullPath).href)
    : { DRIVER_DEPENDENCIES: undefined };

  drivers.push({
    name,
    safeName,
    names,
    subpath,
    optionsTExport,
    optionsTName,
    dependencies,
  });
}

const genCode = /* ts */ `// Auto-generated using scripts/gen-drivers.
// Do not manually edit!

import type { DriverDependencies } from "./types.ts";

${drivers
  .filter((d) => d.optionsTExport)
  .map((d) => /* ts */ {
    let exportName = d.optionsTExport;
    if (exportName !== d.optionsTName) {
      exportName += ` as ${d.optionsTName}`;
    }
    return `import type { ${exportName} } from "${d.subpath}";`;
  })
  .join("\n")}

export type BuiltinDriverName = ${drivers.flatMap((d) => d.names.map((name) => `"${name}"`)).join(" | ")};

export type BuiltinDriverOptions = {
  ${drivers
    .filter((d) => d.optionsTExport)
    .flatMap((d) => d.names.map((name) => `"${name}": ${d.optionsTName};`))
    .join("\n  ")}
};

export const builtinDrivers = {
  ${drivers.flatMap((d) => d.names.map((name) => `"${name}": "${d.subpath}"`)).join(",\n  ")},
} as const;

/**
 * Third-party packages each built-in driver dynamically imports, keyed by the driver
 * option that can be used to provide them (usually \`lib\`).
 *
 * Drivers not listed here have no third-party dependencies.
 */
export const builtinDriverDependencies: Partial<Record<BuiltinDriverName, DriverDependencies>> = {
  ${drivers
    .filter((d) => d.dependencies)
    .flatMap((d) =>
      d.names.map(
        (name) =>
          `"${name}": {\n    ${Object.entries(d.dependencies!)
            .map(
              ([option, dep]) =>
                `${option}: { name: "${dep.name}", version: "${dep.version}"${dep.optional ? ", optional: true" : ""} },`,
            )
            .join("\n    ")}\n  }`,
      ),
    )
    .join(",\n  ")},
};
`;

await writeFile(driversMetaFile, genCode, "utf8");
console.log("Generated drivers metadata file to", driversMetaFile);
