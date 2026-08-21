import { type DriverFactory } from "./utils/index.ts";
import type { Driver } from "unstorage";
import { normalizeKey } from "./utils/index.ts";

export interface OverlayStorageOptions {
  layers: Driver[];
}

const OVERLAY_REMOVED = "__OVERLAY_REMOVED__";

const DRIVER_NAME = "overlay";

const driver: DriverFactory<OverlayStorageOptions> = (options) => {
  return {
    name: DRIVER_NAME,
    // CAS is delegated to the top (writable) layer; preconditions evaluate
    // against its state, not the merged overlay view.
    flags: { cas: !!options.layers[0]?.flags?.cas },
    options: options,
    async hasItem(key, opts) {
      for (const layer of options.layers) {
        if (await layer.hasItem(key, opts)) {
          if (
            layer === options.layers[0] &&
            (await options.layers[0]?.getItem(key)) === OVERLAY_REMOVED
          ) {
            return false;
          }
          return true;
        }
      }
      return false;
    },
    async getItem(key) {
      for (const layer of options.layers) {
        const value = await layer.getItem(key);
        if (value === OVERLAY_REMOVED) {
          return null;
        }
        if (value !== null) {
          return value;
        }
      }
      return null;
    },
    async getMeta(key, opts) {
      return (await options.layers[0]?.getMeta?.(key, opts)) ?? null;
    },
    async setItem(key, value, opts) {
      return options.layers[0]?.setItem?.(key, value, opts);
    },
    async setItemRaw(key, value, opts) {
      return options.layers[0]?.setItemRaw?.(key, value, opts);
    },
    async removeItem(key, opts) {
      await options.layers[0]?.setItem?.(key, OVERLAY_REMOVED, opts);
    },
    async getKeys(base, opts) {
      const allKeys = await Promise.all(
        options.layers.map(async (layer) => {
          const keys = await layer.getKeys(base, opts);
          return keys.map((key) => normalizeKey(key));
        }),
      );
      const uniqueKeys = [...new Set(allKeys.flat())];
      const existingKeys = await Promise.all(
        uniqueKeys.map(async (key) => {
          if ((await options.layers[0]?.getItem(key)) === OVERLAY_REMOVED) {
            return false;
          }
          return key;
        }),
      );
      return existingKeys.filter(Boolean) as string[];
    },
    async dispose() {
      // TODO: Graceful error handling
      await Promise.all(
        options.layers.map(async (layer) => {
          if (layer.dispose) {
            await layer.dispose();
          }
        }),
      );
    },
  };
};

export default driver;
