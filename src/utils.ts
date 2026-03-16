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

  encStorage.hasItem = (key, ...args) =>
    storage.hasItem(
      encryptKeys ? encryptStorageKey(normalizeKey(key), encryptionKey) : key,
      ...args,
    );

  encStorage.getItem = (async (key, ...args) => {
    if (encryptKeys) {
      key = encryptStorageKey(normalizeKey(key), encryptionKey);
    }
    const value = await storage.getItem<StorageValueEnvelope>(key, ...args);
    return value ? destr(decryptStorageValue<string>(value, encryptionKey)) : null;
  }) as Storage<T>["getItem"];

  encStorage.getItems = (async (items, commonOptions) => {
    let encryptedItems: { key: string; value: StorageValueEnvelope | null }[];

    if (encryptKeys) {
      const encryptedKeyItems = items.map((item) => {
        const isStringItem = typeof item === "string";
        const key = encryptStorageKey(normalizeKey(isStringItem ? item : item.key), encryptionKey);
        const options =
          isStringItem || !item.options ? commonOptions : { ...commonOptions, ...item.options };

        return { key, options };
      });
      encryptedItems = (await storage.getItems(encryptedKeyItems, commonOptions)) as {
        key: string;
        value: StorageValueEnvelope | null;
      }[];
    } else {
      encryptedItems = (await storage.getItems(items, commonOptions)) as {
        key: string;
        value: StorageValueEnvelope | null;
      }[];
    }

    return encryptedItems.map((encryptedItem) => {
      const { value, key, ...rest } = encryptedItem;
      return {
        key: encryptKeys ? decryptStorageKey(normalizeKey(key), encryptionKey) : key,
        value: value === null ? null : destr(decryptStorageValue<string>(value, encryptionKey)),
        ...rest,
      };
    });
  }) as Storage<T>["getItems"];

  encStorage.getItemRaw = async (key, ...args) => {
    if (encryptKeys) {
      key = encryptStorageKey(normalizeKey(key), encryptionKey);
    }
    const value = await storage.getItem<StorageValueEnvelope>(key, ...args);
    return value ? decryptStorageValue(value, encryptionKey, true) : null;
  };

  encStorage.setItem = async (key, value, ...args) => {
    if (encryptKeys) {
      key = encryptStorageKey(normalizeKey(key), encryptionKey);
    }
    const encryptedValue = encryptStorageValue(stringify(value), encryptionKey);
    return storage.setItem(key, encryptedValue as unknown as T, ...args);
  };

  encStorage.setItems = async (items, ...args) => {
    const encryptedItems = items.map((item) => {
      const { value, key, ...rest } = item;
      return {
        key: encryptKeys ? encryptStorageKey(normalizeKey(key), encryptionKey) : key,
        value: encryptStorageValue(stringify(value), encryptionKey),
        ...rest,
      };
    });

    return storage.setItems(
      encryptedItems as unknown as { key: string; value: T; options?: TransactionOptions }[],
      ...args,
    );
  };

  encStorage.setItemRaw = async (key, value, ...args) => {
    if (encryptKeys) {
      key = encryptStorageKey(normalizeKey(key), encryptionKey);
    }
    const encryptedValue = encryptStorageValue(value, encryptionKey, true);
    return storage.setItem(key, encryptedValue as unknown as T, ...args);
  };

  encStorage.removeItem = (key, ...args) =>
    storage.removeItem(
      encryptKeys ? encryptStorageKey(normalizeKey(key), encryptionKey) : key,
      ...args,
    );

  encStorage.setMeta = (key, ...args) =>
    storage.setMeta(
      encryptKeys ? encryptStorageKey(normalizeKey(key), encryptionKey) : key,
      ...args,
    );

  encStorage.getMeta = (key, ...args) =>
    storage.getMeta(
      encryptKeys ? encryptStorageKey(normalizeKey(key), encryptionKey) : key,
      ...args,
    );

  encStorage.removeMeta = (key, ...args) =>
    storage.removeMeta(
      encryptKeys ? encryptStorageKey(normalizeKey(key), encryptionKey) : key,
      ...args,
    );

  encStorage.getKeys = async (base, ...args) => {
    if (!encryptKeys) {
      return storage.getKeys(base, ...args);
    }

    const keys = await storage.getKeys("", ...args);
    const decryptedKeys = keys.map((key) => decryptStorageKey(key, encryptionKey));

    if (base) {
      return decryptedKeys.filter((key) => key.startsWith(base) && !key.endsWith("$"));
    }

    return decryptedKeys.filter((key) => !key.endsWith("$"));
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
  if (key?.startsWith("$enc:")) {
    return key;
  }
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
