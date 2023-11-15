import { createRequiredError, defineDriver } from "./utils";

export interface WebStorageOptions {
  base?: string;
  window?: typeof window;
  storageArea?: Storage;
}

const DRIVER_NAME = "web-storage";

export default defineDriver((opts: WebStorageOptions = {}) => {
  if (!opts.window) {
    opts.window = typeof window !== "undefined" ? window : undefined;
  }

  if (!opts.storageArea) {
    throw createRequiredError(DRIVER_NAME, "storageArea");
  }

  const r = (key: string) => (opts.base ? opts.base + ":" : "") + key;

  let _storageListener: undefined | ((ev: StorageEvent) => void);
  const _unwatch = () => {
    if (_storageListener) {
      opts.window?.removeEventListener("storage", _storageListener);
    }
    _storageListener = undefined;
  };

  return {
    name: DRIVER_NAME,
    options: opts,
    hasItem(key) {
      return Object.prototype.hasOwnProperty.call(opts.storageArea!, r(key));
    },
    getItem(key) {
      return opts.storageArea!.getItem(r(key));
    },
    setItem(key, value) {
      return opts.storageArea!.setItem(r(key), value);
    },
    removeItem(key) {
      return opts.storageArea!.removeItem(r(key));
    },
    getKeys() {
      return Object.keys(opts.storageArea!);
    },
    clear() {
      if (!opts.base) {
        opts.storageArea!.clear();
      } else {
        for (const key of Object.keys(opts.storageArea!)) {
          opts.storageArea?.removeItem(key);
        }
      }
      if (opts.window && _storageListener) {
        opts.window.removeEventListener("storage", _storageListener);
      }
    },
    watch(callback) {
      if (!opts.window) {
        return _unwatch;
      }
      _storageListener = (ev: StorageEvent) => {
        if (ev.storageArea !== opts.storageArea) return;

        if (ev.key) {
          callback(ev.newValue ? "update" : "remove", ev.key);
        }
      };
      opts.window.addEventListener("storage", _storageListener);
      return _unwatch;
    },
  };
});
