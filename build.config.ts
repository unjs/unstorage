import { defineBuildConfig } from "unbuild";

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
    {
      input: "src/loader/",
      outDir: "dist/loader",
      format: "esm",
    },
    {
      input: "src/loader/",
      outDir: "dist/loader",
      format: "cjs",
      ext: "cjs",
      declaration: false,
    },
  ],
  externals: ["mongodb", "unstorage", /unstorage\/drivers\//],
});
