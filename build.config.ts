import { defineBuildConfig } from "obuild/config";

export default defineBuildConfig({
  entries: [
    {
      "type": "bundle",
      input: [
        "src/index.ts",
        "src/server.ts",
        "src/tracing.ts"
      ],
      rolldown: {
        resolve: {
          alias: {
            "h3": "h3/generic",
            "srvx": "srvx/generic"
          }
        },
        external: [
          /unstorage\/drivers\//,
        ]
      }
    },
    {
      type: "transform",
      input: "src/drivers/",
      outDir: "dist/drivers",
    },
  ],
});
