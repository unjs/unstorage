import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { findTypeExports } from "mlly";
import { camelCase, upperFirst } from "scule";

const driversDir = fileURLToPath(new URL("../src/drivers", import.meta.url));

const driversMetaFile = fileURLToPath(
  new URL("../src/_drivers.ts", import.meta.url)
);

const driverEntries: string[] = (
  await readdir(driversDir, { withFileTypes: true })
)
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name);

const drivers: {
  name: string;
  safeName: string;
  names: string[];
  subpath: string;
  optionsTExport?: string;
  optionsTName?: string;
}[] = [];

for (const entry of driverEntries) {
  const name = entry.replace(/\.ts$/, "");
  const subpath = `unstorage/drivers/${name}`;
  const fullPath = join(driversDir, `${name}.ts`);

  const contents = await readFile(fullPath, "utf8");
  const optionsTExport = findTypeExports(contents).find((type) =>
    type.name?.endsWith("Options")
  )?.name;

  const safeName = camelCase(name)
    .replace(/kv/i, "KV")
    .replace("localStorage", "localstorage");

  const names = [...new Set([name, safeName])];

  const optionsTName = upperFirst(safeName) + "Options";

  drivers.push({
    name,
    safeName,
    names,
    subpath,
    optionsTExport,
    optionsTName,
  });
}

const genCode = /* ts */ `/**
 * Auto-generated using scripts/gen-drivers.
 * Do not manually edit!
 */

${drivers
  .filter((d) => d.optionsTExport)
  .map(
    (d) =>
      /* ts */ `import type { ${d.optionsTExport} as ${d.optionsTName} } from "${d.subpath}";`
  )
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
`;

await writeFile(driversMetaFile, genCode, "utf8");
console.log("Generated drivers metadata file to", driversMetaFile);
