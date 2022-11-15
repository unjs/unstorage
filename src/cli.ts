import { resolve } from "node:path";
import mri from "mri";
import { listen } from "listhen";
import { createStorage } from "./storage";
import { createStorageServer } from "./server";
import fsDriver from "./drivers/fs";

async function main () {
  const arguments_ = mri(process.argv.splice(2));

  if (arguments_.help) {
    // eslint-disable-next-line no-console
    console.log("Usage: npx unstorage [rootDir]");
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(0);
  }

  const rootDir = resolve(arguments_._[0] || ".");

  const storage = createStorage({
    driver: fsDriver({ base: rootDir })
  });

  const storageServer = createStorageServer(storage);

  await listen(storageServer.handle, {
    name: "Storage server",
    port: 8080
  });
}

// eslint-disable-next-line unicorn/prefer-top-level-await
main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(1);
});
