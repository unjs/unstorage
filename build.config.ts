import { defineBuildConfig } from "obuild/config";

export default defineBuildConfig({
  entries: [
    "src/index",
    "src/server",
    {
      type: "transform",
      input: "src/drivers/",
      outDir: "dist/drivers",
    },
  ],
});
