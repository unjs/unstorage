import { bench, run } from "mitata";
import { listen } from "listhen";
import { $fetch } from "ofetch";
import { createStorage } from "../src/index.ts";
import { createStorageServer } from "../src/server.ts";

async function main() {
  const storage = createStorage();

  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      await storage.set(`key:${i}:${j}`, `value-${i}-${j}`);
    }
  }

  const storageServer = createStorageServer(storage, {});

  const { close, url: serverURL } = await listen(storageServer.handle, {
    port: { random: true },
  });

  const fetchStorage = (url: string, options?: any) =>
    $fetch(url, { baseURL: serverURL, ...options });

  bench("storage server", async () => {
    await Promise.all([fetchStorage(`/key:`), fetchStorage(`/key:0:0`)]);
  });

  await run();

  await close();
}

// eslint-disable-next-line unicorn/prefer-top-level-await
main();
