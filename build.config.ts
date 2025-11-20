import { defineBuildConfig } from "unbuild";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

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
    async "mkdist:done"() {
      const driversDir = fileURLToPath(new URL("drivers", import.meta.url));
      await scan(driversDir);
    },
  },
});

const scan = async (dir: string) => {
  const files = await fs.readdir(dir);
  for (const file of files) {
    const filePath = join(dir, file);
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      await scan(filePath);
    } else if (file.endsWith(".d.ts")) {
      const content = await fs.readFile(filePath, "utf8");
      await fs.writeFile(filePath.replace(".d.ts", ".d.cts"), content);
      await fs.writeFile(filePath.replace(".d.ts", ".d.mts"), content);
    }
  }
};
