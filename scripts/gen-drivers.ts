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
  driverOptionsExport?: string;
  driverName?: string;
}[] = [];

for (const entry of driverEntries) {
  const name = entry.replace(/\.ts$/, "");
  const subpath = `unstorage/drivers/${name}`;
  const fullPath = join(driversDir, `${name}.ts`);

  const contents = await readFile(fullPath, "utf8");
  const typeExports = findTypeExports(contents);
  const optionsTExport = typeExports.find((type) =>
    type.name?.endsWith("Options")
  )?.name;

  const driverOptionsExport = typeExports.find((type) =>
    type.name?.endsWith("Driver")
  )?.name;

  const safeName = camelCase(name)
    .replace(/kv/i, "KV")
    .replace("localStorage", "localstorage");

  const names = [...new Set([name, safeName])];

  // TODO: due to name + safe name, options are duplicated for same driver which is confusing a bit tedious to pass options (e.g. deno-kv or denoKV?) -> currently only (deno-kv works but denoKV is typed)
  const optionsTName = upperFirst(safeName) + "Options";

  const driverName = upperFirst(safeName) + "Driver";

  drivers.push({
    name,
    safeName,
    names,
    subpath,
    optionsTExport,
    optionsTName,
    driverOptionsExport,
    driverName,
  });
}

const genCode = /* ts */ `// Auto-generated using scripts/gen-drivers.
// Do not manually edit!

${drivers
  .filter((d) => d.optionsTExport)
  .map(
    (d) =>
      /* ts */ `import type { ${d.optionsTExport} as ${d.optionsTName} } from "${d.subpath}";`
  )
  .join("\n")}

${drivers
  .filter((d) => d.driverOptionsExport)
  .map(
    (d) =>
      /* ts */ `import type { ${d.driverOptionsExport} as ${d.driverName} } from "${d.subpath}";`
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

export type BuiltinDrivers = {
  ${drivers
    .filter((d) => d.driverOptionsExport)
    .flatMap((d) => d.names.map((name) => `"${name}": ${d.driverName};`))
    .join("\n  ")}
}

export type DriverGetOptions = {
  ${drivers
    .filter((d) => d.driverOptionsExport)
    .map(
      (d) =>
        `"${d.safeName}"?: ${d.driverName} extends { getOptions: infer TGet } ? unknown extends TGet ? {} : TGet : {}`
    )
    .join("\n  ")}
}

export type DriverSetOptions = {
  ${drivers
    .filter((d) => d.driverOptionsExport)
    .map(
      (d) =>
        `"${d.safeName}"?: ${d.driverName} extends { setOptions: infer TSet } ? unknown extends TSet ? {} : TSet : {}`
    )
    .join("\n  ")}
}

export type DriverRemoveOptions = {
  ${drivers
    .filter((d) => d.driverOptionsExport)
    .map(
      (d) =>
        `"${d.safeName}"?: ${d.driverName} extends { removeOptions: infer TRemove } ? unknown extends TRemove ? {} : TRemove : {}`
    )
    .join("\n  ")}
}

export type DriverListOptions = {
  ${drivers
    .filter((d) => d.driverOptionsExport)
    .map(
      (d) =>
        `"${d.safeName}"?: ${d.driverName} extends { listOptions: infer TList } ? unknown extends TList ? {} : TList : {}`
    )
    .join("\n  ")}
}

export type DriverClearOptions = {
  ${drivers
    .filter((d) => d.driverOptionsExport)
    .map(
      (d) =>
        `"${d.safeName}"?: ${d.driverName} extends { clearOptions: infer TClear } ? unknown extends TClear ? {} : TClear : {}`
    )
    .join("\n  ")}
}
`;

await writeFile(driversMetaFile, genCode, "utf8");
console.log("Generated drivers metadata file to", driversMetaFile);
