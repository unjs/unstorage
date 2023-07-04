import { createError, createRequiredError, defineDriver } from "./utils";

export interface SessionStorageOptions {
  base?: string;
  window?: typeof window;
  sessionStorage?: typeof window.sessionStorage;
}

const DRIVER_NAME = "session-storage";

export default defineDriver((opts: SessionStorageOptions = {}) => {
  if (!opts.window) {
    opts.window = typeof window !== "undefined" ? window : undefined;
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
    hasItem(key) {
      return Object.prototype.hasOwnProperty.call(opts.sessionStorage, r(key));
    },
    getItem(key) {
      return opts.sessionStorage!.getItem(r(key)) || undefined;
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
      if (!opts.base) {
        opts.sessionStorage!.clear();
      } else {
        for (const key of Object.keys(opts.sessionStorage!)) {
          opts.sessionStorage?.removeItem(key);
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
