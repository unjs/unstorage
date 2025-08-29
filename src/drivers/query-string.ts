import { defineDriver, normalizeKey } from "./utils";

export interface QueryStringOptions {
  /**
   * URL or Location object to use for reading/writing query parameters
   * @default typeof window !== "undefined" ? window.location : undefined
   */
  url?: URL | Location;

  /**
   * Prefix for all keys to avoid conflicts with other query parameters
   * @default ""
   */
  base?: string;

  /**
   * Whether to update browser history when setting/removing items
   * @default true in browser, false in SSR
   */
  updateHistory?: boolean;

  /**
   * History update method: pushState adds to history, replaceState modifies current entry
   * @default "replaceState"
   */
  historyMethod?: "pushState" | "replaceState";

  /**
   * Window object for browser environments
   * @default typeof window !== "undefined" ? window : undefined
   */
  window?: Window;

  /**
   * Maximum URL length before warning (browsers typically support ~2000 chars)
   * Set to 0 to disable warning
   * @default 2000
   */
  maxUrlLength?: number;
}

const DRIVER_NAME = "query-string";

function isLocation(obj: any): obj is Location {
  return obj && typeof obj.search === "string" && typeof obj.href === "string";
}

function getSearchString(url: URL | Location | undefined): string {
  if (!url) {
    if (typeof window !== "undefined" && window.location) {
      return window.location.search;
    }
    return "";
  }
  return url.search;
}

function serializeValue(value: any): string {
  if (value === undefined) {
    return "";
  }
  if (value === null) {
    return "";  // Store null as empty param value
  }
  if (value === "") {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function deserializeValue(value: string): any {
  if (value === "") {
    return "";
  }
  if (!value) {
    return null;
  }
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (value === "undefined") return undefined;

  const num = Number(value);
  if (!Number.isNaN(num) && value === String(num)) {
    return num;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export default defineDriver((opts: QueryStringOptions = {}) => {
  const base = opts.base ? normalizeKey(opts.base) : "";
  const r = (key: string) => (base ? `${base}_` : "") + normalizeKey(key);

  const getSearchParams = (): URLSearchParams => {
    const searchString = getSearchString(opts.url);
    return new URLSearchParams(searchString);
  };

  const updateURL = (params: URLSearchParams) => {
    const newSearch = params.toString();
    const searchString = newSearch ? `?${newSearch}` : "";

    if (opts.maxUrlLength && opts.maxUrlLength > 0) {
      const currentUrl =
        opts.url || (typeof window === "undefined" ? null : window.location);
      if (currentUrl && isLocation(currentUrl)) {
        const newUrl =
          currentUrl.origin +
          currentUrl.pathname +
          searchString +
          currentUrl.hash;
        if (newUrl.length > opts.maxUrlLength) {
          console.warn(
            `[unstorage] [${DRIVER_NAME}] URL length (${newUrl.length}) exceeds recommended maximum (${opts.maxUrlLength})`
          );
        }
      }
    }

    const _window = opts.window || (typeof window !== "undefined" ? window : undefined);
    
    if (_window && opts.updateHistory !== false) {
      const currentUrl = opts.url || _window.location;

      if (isLocation(currentUrl)) {
        const newUrl = currentUrl.pathname + searchString + currentUrl.hash;
        const historyMethod = opts.historyMethod || "replaceState";

        if (_window.history && _window.history[historyMethod]) {
          _window.history[historyMethod](null, "", newUrl);
        }
      }
    } else if (opts.url instanceof URL) {
      opts.url.search = searchString;
    }
  };

  let _watchListener: ((event: PopStateEvent) => void) | undefined;
  const _unwatch = () => {
    if (_watchListener && opts.window) {
      opts.window.removeEventListener("popstate", _watchListener);
    }
    _watchListener = undefined;
  };

  return {
    name: DRIVER_NAME,
    options: opts,
    hasItem(key) {
      return getSearchParams().has(r(key));
    },
    getItem(key) {
      const value = getSearchParams().get(r(key));
      return value === null ? null : deserializeValue(value);
    },
    setItem(key, value) {
      const params = getSearchParams();
      params.set(r(key), serializeValue(value));
      updateURL(params);
    },
    removeItem(key) {
      const params = getSearchParams();
      if (params.has(r(key))) {
        params.delete(r(key));
        updateURL(params);
      }
    },
    getKeys() {
      const params = getSearchParams();
      const keys: string[] = [];
      const prefix = base ? `${base}_` : "";

      for (const key of params.keys()) {
        if (!base || key.startsWith(prefix)) {
          const cleanKey = base ? key.slice(prefix.length) : key;
          keys.push(cleanKey);
        }
      }
      return keys;
    },
    clear(prefix) {
      const params = getSearchParams();
      const keysToDelete: string[] = [];
      const searchPrefix = prefix
        ? base
          ? `${base}_${normalizeKey(prefix)}`
          : normalizeKey(prefix)
        : base
          ? `${base}_`
          : "";

      for (const key of params.keys()) {
        if (!searchPrefix || key.startsWith(searchPrefix)) {
          keysToDelete.push(key);
        }
      }

      for (const key of keysToDelete) {
        params.delete(key);
      }

      updateURL(params);
    },
    dispose() {
      _unwatch();
    },
    watch(callback) {
      if (!opts.window && typeof window === "undefined") {
        return _unwatch;
      }

      const _window = opts.window || window;
      const previousParams = getSearchParams();

      _watchListener = () => {
        const currentParams = getSearchParams();
        const prefix = base ? `${base}_` : "";

        const allKeys = new Set([
          ...previousParams.keys(),
          ...currentParams.keys(),
        ]);

        for (const key of allKeys) {
          if (!base || key.startsWith(prefix)) {
            const prevValue = previousParams.get(key);
            const currValue = currentParams.get(key);

            if (prevValue !== currValue) {
              const cleanKey = base ? key.slice(prefix.length) : key;
              const event = currValue === null ? "remove" : "update";
              callback(event, cleanKey);
            }
          }
        }

        for (const key of previousParams.keys()) {
          previousParams.delete(key);
        }
        for (const [key, value] of currentParams) {
          previousParams.set(key, value);
        }
      };

      _window.addEventListener("popstate", _watchListener);
      return _unwatch;
    },
  };
});
