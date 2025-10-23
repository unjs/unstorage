import { openKv, type Kv } from "@deno/kv";
import { defineDriver } from "./utils/index.ts";
import type { DriverFactory } from "./utils/index.ts";
import denoKV from "./deno-kv.ts";

// https://docs.deno.com/deploy/kv/manual/node/

export interface DenoKvNodeOptions {
  base?: string;
  path?: string;
  openKvOptions?: Parameters<typeof openKv>[1];
}

const DRIVER_NAME = "deno-kv-node";

export default defineDriver<DenoKvNodeOptions, Kv | Promise<Kv>>(
  (opts: DenoKvNodeOptions = {}) => {
    const baseDriver = denoKV({
      ...opts,
      openKv: () => openKv(opts.path, opts.openKvOptions),
    });
    return {
      ...baseDriver,
      getInstance() {
        return baseDriver.getInstance!() as Promise<Kv>;
      },
      name: DRIVER_NAME,
    };
  }
) as DriverFactory<DenoKvNodeOptions, Kv | Promise<Kv>>;
