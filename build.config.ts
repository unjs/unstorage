import { defineBuildConfig } from "unbuild";
import { glob } from "tinyglobby";
import { basename } from "node:path";
import { writeFile } from "node:fs/promises";

export default defineBuildConfig({
  declaration: true,
  rollup: {
    emitCJS: true,
  },
  entries: [
    "src/index",
    "src/server",
    {
      input: "src/drivers/",
      outDir: "drivers",
      format: "esm",
    },
    {
      input: "src/drivers/",
      outDir: "drivers",
      format: "cjs",
      ext: "cjs",
      declaration: false,
    },
  ],
  externals: ["mongodb", "unstorage", /unstorage\/drivers\//],
  hooks: {
    async "build:done"(ctx) {
      // module: NodeNext support
      // https://github.com/unjs/unstorage/pull/700#issuecomment-3472779221
      const driverDeclarations = await glob("drivers/**/*.d.ts");
      for (const dtsPath of driverDeclarations) {
        const mtsPath = dtsPath.replace(/\.d\.ts$/, `.d.mts`);
        const baseName = basename(dtsPath, ".d.ts");
        await writeFile(
          mtsPath,
          `export { default } from './${baseName}';\nexport * from './${baseName}';\n`
        );
      }
    },
  },
});
