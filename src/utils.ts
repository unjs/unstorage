import destr from "destr";
import {
  decryptStorageKey,
  decryptStorageValue,
  encryptStorageKey,
  encryptStorageValue,
  stringify,
  type StorageValueEnvelope,
} from "./_utils.ts";
import type { Storage, StorageValue, TransactionOptions } from "./types.ts";

type StorageKeys = Array<keyof Storage>;

const storageKeyProperties: StorageKeys = [
  "has",
  "hasItem",
  "get",
  "getItem",
  "getItemRaw",
  "set",
  "setItem",
  "setItemRaw",
  "del",
  "remove",
  "removeItem",
  "getMeta",
  "setMeta",
  "removeMeta",
  "getKeys",
  "clear",
  "mount",
  "unmount",
];

export function prefixStorage<T extends StorageValue>(
  storage: Storage<T> | Storage<any>,
  base: string,
): Storage<T>;
export function prefixStorage<T extends StorageValue>(
  storage: Storage<T>,
  base: string,
): Storage<T> {
  base = normalizeBaseKey(base);
  if (!base) {
    return storage;
  }
  const nsStorage: Storage<T> = { ...storage };
  for (const property of storageKeyProperties) {
    // @ts-ignore
    nsStorage[property] = (key = "", ...args) =>
      // @ts-ignore
      storage[property](base + key, ...args);
  }
  nsStorage.getKeys = (key = "", ...arguments_) =>
    storage
      .getKeys(base + key, ...arguments_)
      .then((keys) => keys.map((key) => key.slice(base.length)));

  nsStorage.keys = nsStorage.getKeys;

  nsStorage.getItems = async <U extends T>(
    items: (string | { key: string; options?: TransactionOptions })[],
    commonOptions?: TransactionOptions,
  ) => {
    const prefixedItems = items.map((item) =>
      typeof item === "string" ? base + item : { ...item, key: base + item.key },
    );
    const results = await storage.getItems<U>(prefixedItems, commonOptions);
    return results.map((entry) => ({
      key: entry.key.slice(base.length),
      value: entry.value,
    }));
  };

  nsStorage.setItems = async <U extends T>(
    items: { key: string; value: U; options?: TransactionOptions }[],
    commonOptions?: TransactionOptions,
  ) => {
    const prefixedItems = items.map((item) => ({
      key: base + item.key,
      value: item.value,
      options: item.options,
    }));
    return storage.setItems<U>(prefixedItems, commonOptions);
  };

  return nsStorage;
}

export function encryptedStorage<T extends StorageValue>(
  storage: Storage<T>,
  encryptionKey: string,
  encryptKeys = false,
): Storage<T> {
  const encStorage: Storage<T> = { ...storage };

  const getStoredKey = (key: string) =>
    encryptKeys ? encryptStorageKey(normalizeKey(key), encryptionKey) : key;

  const getItemOptions = (
    item: string | { key: string; options?: TransactionOptions },
    commonOptions?: TransactionOptions,
  ) => {
    return typeof item === "string" || !item.options
      ? commonOptions
      : { ...commonOptions, ...item.options };
  };

  encStorage.hasItem = (key, ...args) => storage.hasItem(getStoredKey(key), ...args);

  encStorage.getItem = (async (key, ...args) => {
    const value = await storage.getItem<StorageValueEnvelope>(getStoredKey(key), ...args);
    return value === null ? null : destr(decryptStorageValue<string>(value, encryptionKey));
  }) as Storage<T>["getItem"];

  encStorage.getItems = (async (items, commonOptions) => {
    return Promise.all(
      items.map(async (item) => {
        const key = typeof item === "string" ? item : item.key;
        return {
          key: normalizeKey(key),
          value: await encStorage.getItem(key, getItemOptions(item, commonOptions)),
        };
      }),
    );
  }) as Storage<T>["getItems"];

  encStorage.getItemRaw = async (key, ...args) => {
    const value = await storage.getItem<StorageValueEnvelope>(getStoredKey(key), ...args);
    return value === null ? null : decryptStorageValue(value, encryptionKey, true);
  };

  encStorage.setItem = async (key, value, ...args) => {
    const encryptedValue = encryptStorageValue(stringify(value), encryptionKey);
    return storage.setItem(getStoredKey(key), encryptedValue as unknown as T, ...args);
  };

  encStorage.setItems = async (items, commonOptions) => {
    await Promise.all(
      items.map((item) =>
        encStorage.setItem(item.key, item.value, getItemOptions(item, commonOptions)),
      ),
    );
  };

  encStorage.setItemRaw = async (key, value, ...args) => {
    const encryptedValue = encryptStorageValue(value, encryptionKey, true);
    return storage.setItem(getStoredKey(key), encryptedValue as unknown as T, ...args);
  };

  encStorage.removeItem = (key, ...args) => storage.removeItem(getStoredKey(key), ...args);
  encStorage.setMeta = (key, ...args) => storage.setMeta(getStoredKey(key), ...args);
  encStorage.getMeta = (key, ...args) => storage.getMeta(getStoredKey(key), ...args);
  encStorage.removeMeta = (key, ...args) => storage.removeMeta(getStoredKey(key), ...args);

  encStorage.getKeys = async (base, ...args) => {
    if (!encryptKeys) {
      return storage.getKeys(base, ...args);
    }

    const normalizedBase = normalizeKey(base);
    const keys = await storage.getKeys("", ...args);
    const decryptedKeys = keys.map((key) => decryptStorageKey(key, encryptionKey));

    return normalizedBase
      ? decryptedKeys.filter((key) => key.startsWith(normalizedBase))
      : decryptedKeys;
  };

  encStorage.keys = encStorage.getKeys;
  encStorage.get = (key, opts = {}) => encStorage.getItem(key, opts);
  encStorage.set = (key, value, opts = {}) => encStorage.setItem(key, value, opts);
  encStorage.has = (key, opts = {}) => encStorage.hasItem(key, opts);
  encStorage.del = (key, opts = {}) => encStorage.removeItem(key, opts);
  encStorage.remove = (key, opts = {}) => encStorage.removeItem(key, opts);

  return encStorage;
}

export function normalizeKey(key?: string): string {
  if (!key) {
    return "";
  }
  return key.split("?")[0]?.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "") || "";
}

export function joinKeys(...keys: string[]): string {
  return normalizeKey(keys.join(":"));
}

export function normalizeBaseKey(base?: string): string {
  base = normalizeKey(base);
  return base ? base + ":" : "";
}

export function filterKeyByDepth(key: string, depth: number | undefined): boolean {
  if (depth === undefined) {
    return true;
  }

  let substrCount = 0;
  let index = key.indexOf(":");

  while (index > -1) {
    substrCount++;
    index = key.indexOf(":", index + 1);
  }

  return substrCount <= depth;
}

export function filterKeyByBase(key: string, base: string | undefined): boolean {
  if (base) {
    return key.startsWith(base) && key[key.length - 1] !== "$";
  }

  return key[key.length - 1] !== "$";
}
