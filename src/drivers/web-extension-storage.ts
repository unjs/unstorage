import { createError, defineDriver, normalizeKey } from "./utils/index.ts";

/* BEGIN Web Extension Storage types */

interface StorageAreaInstance {
  get(keys: string | string[] | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
  clear(): Promise<void>;
}

interface BrowserStorage {
  local: StorageAreaInstance;
  session: StorageAreaInstance;
  sync: StorageAreaInstance;
  managed: StorageAreaInstance;
}

interface Browser {
  storage: BrowserStorage;
}

declare const browser: Browser | undefined;
declare const chrome: Browser | undefined;

/* END Web Extension Storage types */

export type StorageArea = "local" | "session" | "sync" | "managed";

export interface WebExtensionStorageOptions {
  /** Storage area to use. Defaults to "local". */
  storageArea?: StorageArea;
  /** Optional base/prefix for keys */
  base?: string;
}

const DRIVER_NAME = "web-extension-storage";

export default defineDriver((opts: WebExtensionStorageOptions = {}) => {
  const storageArea = opts.storageArea || "local";
  const base = opts.base ? normalizeKey(opts.base) : "";
  const r = (key: string) => (base ? `${base}:` : "") + key;

  const _browser: Browser | undefined =
    // eslint-disable-next-line unicorn/no-typeof-undefined
    typeof browser === "undefined" ? chrome : browser;

  const storage = _browser?.storage?.[storageArea];
  if (!storage) {
    throw createError(
      DRIVER_NAME,
      `\`browser.storage.${storageArea}\` is not available. Ensure "storage" permission is declared in the extension manifest.`
    );
  }

  return {
    name: DRIVER_NAME,
    options: opts,
    getInstance: () => storage,
    async hasItem(key) {
      const result = await storage.get(r(key));
      return r(key) in result;
    },
    async getItem(key) {
      const result = await storage.get(r(key));
      return result[r(key)] ?? null;
    },
    async setItem(key, value) {
      await storage.set({ [r(key)]: value });
    },
    async removeItem(key) {
      await storage.remove(r(key));
    },
    async getKeys() {
      const result = await storage.get(null);
      const allKeys = Object.keys(result);
      return base
        ? allKeys
            .filter((key) => key.startsWith(`${base}:`))
            .map((key) => key.slice(base.length + 1))
        : allKeys;
    },
    async clear(prefix) {
      const _base = [base, prefix].filter(Boolean).join(":");
      if (_base) {
        const result = await storage.get(null);
        const keysToRemove = Object.keys(result).filter((key) =>
          key.startsWith(`${_base}:`)
        );
        if (keysToRemove.length > 0) {
          await storage.remove(keysToRemove);
        }
      } else {
        await storage.clear();
      }
    },
  };
});
