import { defineBuildConfig } from "obuild/config";

export default defineBuildConfig({
  entries: [
    "src/index",
    "src/server",
    "src/tracing",
    {
      type: "transform",
      input: "src/drivers/",
      outDir: "dist/drivers",
    },
  ],
});
