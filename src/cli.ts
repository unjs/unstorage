import { resolve } from "node:path";
import { defineCommand, runMain } from "citty";
import { serve } from "srvx";
import { createStorage } from "./storage.ts";
import { createStorageHandler } from "./server.ts";
import fsDriver from "./drivers/fs.ts";

const main = defineCommand({
  meta: {
    name: "unstorage",
    description: "Unstorage CLI",
  },
  args: {
    dir: {
      type: "string",
      description: "project root directory",
    },
    port: {
      type: "string",
      description: "port to listen on",
    },
    host: {
      type: "string",
      description: "hostname to listen on",
    },
    _dir: {
      type: "positional",
      default: ".",
      description: "project root directory (prefer using `--dir`)",
    },
  },
  async run({ args }) {
    const rootDir = resolve(args.dir || args._dir);

    const storage = createStorage({
      driver: fsDriver({ base: rootDir }),
    });

    const storageHandler = createStorageHandler(storage);

    serve({
      fetch: storageHandler,
      port: args.port,
      hostname: args.host,
    });
  },
});

runMain(main);
