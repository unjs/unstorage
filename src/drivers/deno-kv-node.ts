import { openKv, type Kv } from "@deno/kv";
import { type DriverFactory } from "./utils/index.ts";
import denoKV from "./deno-kv.ts";

// https://docs.deno.com/deploy/kv/manual/node/

export interface DenoKvNodeOptions {
  base?: string;
  path?: string;
  openKvOptions?: Parameters<typeof openKv>[1];
}

const DRIVER_NAME = "deno-kv-node";

const driver: DriverFactory<DenoKvNodeOptions, Kv | Promise<Kv>> = (
  (opts) => {
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
);


export default driver;
