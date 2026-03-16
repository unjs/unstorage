import { bench, run } from "mitata";
import { serve } from "srvx";
import { $fetch } from "ofetch";
import { createStorage } from "../src/index.ts";
import { createStorageHandler } from "../src/server.ts";

async function main() {
  const storage = createStorage();

  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      await storage.set(`key:${i}:${j}`, `value-${i}-${j}`);
    }
  }

  const storageServer = createStorageHandler(storage, {});

  const server = await serve({
    fetch: storageServer,
    port: 0,
  });

  const fetchStorage = (url: string, options?: any) =>
    $fetch(url, { baseURL: server.url, ...options });

  bench("storage server", async () => {
    await Promise.all([fetchStorage(`/key:`), fetchStorage(`/key:0:0`)]);
  });

  await run();

  await server.close();
}

// eslint-disable-next-line unicorn/prefer-top-level-await
main();
