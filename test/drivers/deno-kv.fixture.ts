import { createServer } from "node:http";
import { createStorage } from "../../src";
import denoKV from "../../src/drivers/deno-kv.ts";
import { createStorageServer } from "../../src/server";

const storage = createStorage({
  driver: denoKV({ path: "./tmp/deno-kv" }),
});

createServer(createStorageServer(storage).handle).listen(3000, () => {
  console.log("Server running at http://localhost:3000/");
});
