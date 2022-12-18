import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  declaration: true,
  rollup: {
    emitCJS: true
  },
  entries: [
    "src/index",
    "src/server",
    { input: "src/drivers/", outDir: "dist/drivers", format: "esm" },
    { input: "src/drivers/", outDir: "dist/drivers", format: "cjs", ext: "cjs", declaration: false }
  ],
  hooks: {
    async "build:done" (ctx) {
      for (const entry of ctx.buildEntries) {
        if (/^drivers\/.*\.d\.ts$/.test(entry.path)) {
          const target = fileURLToPath(new URL(join("dist", entry.path), import.meta.url))
          const declaration = fileURLToPath(new URL(entry.path, import.meta.url));
          const relativePath = relative(dirname(declaration), target);

          await mkdir(dirname(declaration), { recursive: true });
          await writeFile(declaration, [
            `export * from "${relativePath.slice(0, -5)}";`,
            `export { default } from "${relativePath.slice(0, -5)}";`
          ].join("\n"));
        }
      }
    }
  }
});
