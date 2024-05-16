import { createRequiredError, defineDriver } from "./utils";

export interface LocalStorageOptions {
  base?: string;
  window?: typeof window;
  localStorage?: typeof window.localStorage;
}

const DRIVER_NAME = "localstorage";

export default defineDriver((opts: LocalStorageOptions = {}) => {
  if (!opts.window) {
    opts.window = typeof window === "undefined" ? undefined : window;
  }
  if (!opts.localStorage) {
    opts.localStorage = opts.window?.localStorage;
  }
  if (!opts.localStorage) {
    throw createRequiredError(DRIVER_NAME, "localStorage");
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
    getInstance: () => opts.localStorage!,
    hasItem(key) {
      return Object.prototype.hasOwnProperty.call(opts.localStorage!, r(key));
    },
    getItem(key) {
      return opts.localStorage!.getItem(r(key));
    },
    setItem(key, value) {
      return opts.localStorage!.setItem(r(key), value);
    },
    removeItem(key) {
      return opts.localStorage!.removeItem(r(key));
    },
    getKeys() {
      return Object.keys(opts.localStorage!);
    },
    clear() {
      if (opts.base) {
        for (const key of Object.keys(opts.localStorage!)) {
          opts.localStorage?.removeItem(key);
        }
      } else {
        opts.localStorage!.clear();
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
        if (ev.key) {
          callback(ev.newValue ? "update" : "remove", ev.key);
        }
      };
      opts.window.addEventListener("storage", _storageListener);
      return _unwatch;
    },
  };
});
