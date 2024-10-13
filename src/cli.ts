import { resolve } from "node:path";
import { defineCommand, runMain } from "citty";
import { listen } from "listhen";
import { createStorage } from "./storage";
import { createStorageServer } from "./server";
import fsDriver from "./drivers/fs";

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
    _dir: {
      type: "positional",
      default: ".",
      description: "project root directory (prefer using `--dir`)",
    },
  },
  async run(args) {
    const rootDir = resolve(args.args.dir || args.args._dir);

    const storage = createStorage({
      driver: fsDriver({ base: rootDir }),
    });

    const storageServer = createStorageServer(storage);

    await listen(storageServer.handle, {
      name: "Storage server",
      port: 8080,
    });
  },
});

runMain(main);
