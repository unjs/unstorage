import type { openKv, Kv } from "@deno/kv";
import {
  type DriverFactory,
  importLib,
  type LibImport,
  type DriverDependencies,
} from "./utils/index.ts";
import denoKV from "./deno-kv.ts";

// https://docs.deno.com/deploy/kv/manual/node/

export interface DenoKvNodeOptions {
  base?: string;
  path?: string;
  openKvOptions?: Parameters<typeof openKv>[1];

  /**
   * Optionally provide the [`@deno/kv`](https://www.npmjs.com/package/@deno/kv) library
   * to avoid dynamically importing it.
   */
  lib?: LibImport<typeof import("@deno/kv")>;
}

export const DRIVER_DEPENDENCIES: DriverDependencies = {
  lib: { name: "@deno/kv", version: ">=0.14.0" },
};

const DRIVER_NAME = "deno-kv-node";

const driver: DriverFactory<DenoKvNodeOptions, Promise<Kv>> = (opts) => {
  const baseDriver = denoKV({
    ...opts,
    openKv: async () => {
      const { openKv } = await importLib(
        DRIVER_NAME,
        "@deno/kv",
        opts.lib,
        () => import("@deno/kv"),
      );
      return openKv(opts.path, opts.openKvOptions);
    },
  });
  return {
    ...baseDriver,
    getInstance() {
      return baseDriver.getInstance!() as Promise<Kv>;
    },
    name: DRIVER_NAME,
  };
};

export default driver;
