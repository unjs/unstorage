import { createServer } from "node:http";
import { createStorage } from "../../src/index.ts";
import denoKV from "../../src/drivers/deno-kv.ts";
import { createStorageServer } from "../../src/server.ts";

const storage = createStorage({
  driver: denoKV({
    path: ":memory:",
    base: Math.round(Math.random() * 1_000_000).toString(16),
  }),
});

const port = Number(process.env.PORT) || 3000;

createServer(createStorageServer(storage).handle).listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
