import {
  createRequiredError,
  defineDriver,
  normalizeKey,
} from "./utils/index.ts";

export interface LocalStorageOptions {
  base?: string;
  window?: typeof window;
  windowKey?: "localStorage" | "sessionStorage";
  storage?: typeof window.localStorage | typeof window.sessionStorage;
  /** @deprecated use `storage` option */
  sessionStorage?: typeof window.sessionStorage;
  /** @deprecated use `storage` option */
  localStorage?: typeof window.localStorage;
}

const DRIVER_NAME = "localstorage";

export default defineDriver((opts: LocalStorageOptions = {}) => {
  const storage: typeof window.localStorage | typeof window.sessionStorage =
    opts.storage ||
    opts.localStorage ||
    opts.sessionStorage ||
    (opts.window || globalThis.window)?.[opts.windowKey || "localStorage"];

  if (!storage) {
    throw createRequiredError(DRIVER_NAME, "localStorage");
  }

  const base = opts.base ? normalizeKey(opts.base) : "";
  const r = (key: string) => (base ? `${base}:` : "") + key;

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
    getInstance: () => storage!,
    hasItem(key) {
      return Object.prototype.hasOwnProperty.call(storage!, r(key));
    },
    getItem(key) {
      return storage!.getItem(r(key));
    },
    setItem(key, value) {
      return storage!.setItem(r(key), value);
    },
    removeItem(key) {
      return storage!.removeItem(r(key));
    },
    getKeys() {
      const allKeys = Object.keys(storage!);
      return base
        ? allKeys
            .filter((key) => key.startsWith(`${base}:`))
            .map((key) => key.slice(base.length + 1))
        : allKeys;
    },
    clear(prefix) {
      const _base = [base, prefix].filter(Boolean).join(":");
      if (_base) {
        for (const key of Object.keys(storage!)) {
          if (key.startsWith(`${_base}:`)) {
            storage?.removeItem(key);
          }
        }
      } else {
        storage!.clear();
      }
    },
    dispose() {
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
