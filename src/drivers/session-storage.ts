import { createRequiredError, defineDriver } from "./utils";

export interface SessionStorageOptions {
  base?: string;
  window?: typeof globalThis;
  sessionStorage?: typeof globalThis.sessionStorage;
}

const DRIVER_NAME = "session-storage";

export default defineDriver((opts: SessionStorageOptions = {}) => {
  if (!opts.window) {
    opts.window = typeof globalThis === "undefined" ? undefined : globalThis;
  }
  if (!opts.sessionStorage) {
    opts.sessionStorage = opts.window?.sessionStorage;
  }
  if (!opts.sessionStorage) {
    throw createRequiredError(DRIVER_NAME, "sessionStorage");
  }

  const r = (key: string) => (opts.base ? opts.base + ":" : "") + key;

  let _storageListener: undefined | ((ev: StorageEvent) => void);
  const _unwatch = () => {
    if (_storageListener) {
      opts.window!.removeEventListener("storage", _storageListener);
    }
    _storageListener = undefined;
  };

  return {
    name: DRIVER_NAME,
    options: opts,
    getInstance: () => opts.sessionStorage!,
    hasItem(key) {
      return Object.prototype.hasOwnProperty.call(opts.sessionStorage, r(key));
    },
    getItem(key) {
      return opts.sessionStorage!.getItem(r(key));
    },
    setItem(key, value) {
      return opts.sessionStorage!.setItem(r(key), value);
    },
    removeItem(key) {
      return opts.sessionStorage!.removeItem(r(key));
    },
    getKeys() {
      return Object.keys(opts.sessionStorage!);
    },
    clear() {
      if (opts.base) {
        for (const key of Object.keys(opts.sessionStorage!)) {
          opts.sessionStorage?.removeItem(key);
        }
      } else {
        opts.sessionStorage!.clear();
      }
      if (opts.window && _storageListener) {
        opts.window.removeEventListener("storage", _storageListener);
      }
    },
    watch(callback) {
      if (!opts.window) {
        return _unwatch;
      }
      _storageListener = ({ key, newValue }: StorageEvent) => {
        if (key) {
          callback(newValue ? "update" : "remove", key);
        }
      };
      opts.window!.addEventListener("storage", _storageListener);

      return _unwatch;
    },
  };
});
