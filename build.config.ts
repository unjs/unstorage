import { minifySync } from "oxc-minify";
import { defineBuildConfig } from "obuild/config";
import type { Plugin } from "rolldown";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export default defineBuildConfig({
  entries: [
    {
      type: "bundle",
      input: ["src/index.ts", "src/server.ts", "src/tracing.ts"],
      rolldown: {
        resolve: {
          alias: {
            h3: "h3/generic",
            srvx: "srvx/generic",
          },
        },
        external: [/unstorage\/drivers\//],
        plugins: [
          // Minify bundled lib chunks to reduce dist size
          // Using writeBundle instead of renderChunk because rolldown's
          // codegen re-formats the output after renderChunk, undoing minification
          <Plugin>{
            name: "minify-libs",
            // renderChunk(code, chunk) {
            //   if (chunk.fileName.startsWith("_chunks/libs/")) {
            //     return { code: minifySync(chunk.fileName, code, { compress: true, mangle: true }).code };
            //   }
            // },
            writeBundle(options, bundle) {
              const outDir = options.dir || "dist";
              for (const fileName in bundle) {
                if (fileName.startsWith("_chunks/libs/")) {
                  const filePath = resolve(outDir, fileName);
                  const code = readFileSync(filePath, "utf8");
                  const result = minifySync(fileName, code, {
                    compress: true,
                    mangle: true,
                  });
                  writeFileSync(filePath, result.code);
                }
              }
            },
          },
        ],
      },
    },
    {
      type: "transform",
      input: "src/drivers/",
      outDir: "dist/drivers",
    },
  ],
});
