import { defineDriver } from "./utils";
import type { Driver } from "../types";
import { normalizeKey } from "./utils";

export interface OverlayStorageOptions {
  layers: Driver[];
}

const OVERLAY_REMOVED = "__OVERLAY_REMOVED__";

export default defineDriver((options: OverlayStorageOptions) => {
  return {
    name: "overlay",
    options: options,
    async hasItem(key) {
      for (const layer of options.layers) {
        if (await layer.hasItem(key)) {
          if (layer === options.layers[0]) {
            if ((await options.layers[0]?.getItem(key)) === OVERLAY_REMOVED) {
              return false;
            }
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
          return undefined;
        }
        if (value !== undefined) {
          return value;
        }
      }
      return undefined;
    },
    // TODO: Support native meta
    // async getMeta (key) {},
    async setItem(key, value) {
      await options.layers[0]?.setItem(key, value);
    },
    async removeItem(key) {
      await options.layers[0]?.setItem(key, OVERLAY_REMOVED);
    },
    async getKeys(base) {
      const allKeys = await Promise.all(
        options.layers.map(async (layer) => {
          const keys = await layer.getKeys(base);
          return keys.map((key) => normalizeKey(key));
        })
      );
      const uniqueKeys = Array.from(new Set(allKeys.flat()));
      const existingKeys = await Promise.all(
        uniqueKeys.map(async (key) => {
          if ((await options.layers[0]?.getItem(key)) === OVERLAY_REMOVED) {
            return false;
          }
          return key;
        })
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
        })
      );
    },
  };
});
