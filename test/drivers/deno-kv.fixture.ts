import { serve } from "srvx";
import { createStorage } from "../../src/index.ts";
import denoKV from "../../src/drivers/deno-kv.ts";
import { createStorageHandler } from "../../src/server.ts";

const storage = createStorage({
  driver: denoKV({
    path: ":memory:",
    base: Math.round(Math.random() * 1_000_000).toString(16),
  }),
});

serve({ fetch: createStorageHandler(storage) });
