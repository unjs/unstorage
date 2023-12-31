import destr from "destr";
import { StorageValueEnvelope, decryptStorageKey, decryptStorageValue, encryptStorageKey, encryptStorageValue, stringify } from "./_utils";
import type { Storage, StorageValue } from "./types";

type StorageKeys = Array<keyof Storage>;

const storageKeyProperties: StorageKeys = [
  "hasItem",
  "getItem",
  "getItemRaw",
  "setItem",
  "setItemRaw",
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
  storage: Storage<T>,
  base: string
): Storage<T> {
  base = normalizeBaseKey(base);
  if (!base) {
    return storage;
  }
  const nsStorage: Storage = { ...storage };
  for (const property of storageKeyProperties) {
    // @ts-ignore
    nsStorage[property] = (key = "", ...args) =>
      // @ts-ignore
      storage[property](base + key, ...args);
  }
  nsStorage.getKeys = (key = "", ...arguments_) =>
    storage
      .getKeys(base + key, ...arguments_)
      // Remove Prefix
      .then((keys) => keys.map((key) => key.slice(base.length)));

  return nsStorage;
}

export function encryptedStorage<T extends StorageValue>(
  storage: Storage<T>,
  encryptionKey: string,
  encryptKeys?: boolean,
): Storage<T> {
  const encStorage: Storage = { ...storage };

  encStorage.hasItem = (key = "", ...args) =>
    storage.hasItem(encryptKeys ? encryptStorageKey(normalizeKey(key), encryptionKey) : key, ...args);

  encStorage.getItem = async (key, ...args) => {
    if (encryptKeys) {
      key = encryptStorageKey(normalizeKey(key), encryptionKey);
    }
    const value = await storage.getItem(key, ...args);
    return value ? destr(decryptStorageValue(value as StorageValueEnvelope, encryptionKey)) : null;
  };

  encStorage.getItems = async (items, commonOptions) => {
    let encryptedItems;
    if (encryptKeys) {
      const encryptedKeyItems = items.map((item) => {
        const isStringItem = typeof item === "string";
        const key = encryptStorageKey(normalizeKey(isStringItem ? item : item.key), encryptionKey);
        const options =
          isStringItem || !item.options
            ? commonOptions
            : { ...commonOptions, ...item.options };

        return { key, options };
      });
      encryptedItems = await storage.getItems(encryptedKeyItems, commonOptions);
    } else {
      encryptedItems = await storage.getItems(items, commonOptions);
    }
    return (encryptedItems.map((encryptedItem) => {
      const { value, key, ...rest } = encryptedItem;
      const decryptedValue = (decryptStorageValue(value as StorageValueEnvelope, encryptionKey)) as StorageValue;
      return { value: decryptedValue, key: encryptKeys ? decryptStorageKey(normalizeKey(key), encryptionKey) : key, ...rest };
    }));
  };

  encStorage.getItemRaw = async (key, ...args) => {
    const value = await storage.getItem(key, ...args);
    return value ? decryptStorageValue(value as StorageValueEnvelope, encryptionKey, true) : null;
  };

  // eslint-disable-next-line require-await
  encStorage.setItem = async (key, value, ...args) => {
    if (encryptKeys) {
      key = encryptStorageKey(normalizeKey(key), encryptionKey);
    }
    const encryptedValue = encryptStorageValue(stringify(value), encryptionKey);
    storage.setItem(key, encryptedValue as T, ...args);
  };

  // eslint-disable-next-line require-await
  encStorage.setItems = async (items, ...args) => {
    const encryptedItems = items.map((item) => {
      const { value, key, ...rest } = item;
      const encryptedValue: StorageValueEnvelope = encryptStorageValue(stringify(value), encryptionKey);
      return { value: encryptedValue, key: encryptKeys ? encryptStorageKey(normalizeKey(key), encryptionKey) : key, ...rest };
    });
    storage.setItems<StorageValueEnvelope>(encryptedItems, ...args);
  };

  // eslint-disable-next-line require-await
  encStorage.setItemRaw = async (key, value, ...args) => {
    const encryptedValue = encryptStorageValue(value, encryptionKey, true);
    storage.setItem(key, encryptedValue as T, ...args);
  };

  encStorage.removeItem = (key, ...args) =>
    storage.removeItem(encryptKeys ? encryptStorageKey(normalizeKey(key), encryptionKey) : key, ...args);

  // TODO: Meta encryption
  encStorage.setMeta = (key, ...args) =>
    storage.setMeta(encryptKeys ? encryptStorageKey(normalizeKey(key), encryptionKey) : key, ...args);

  // TODO: Meta encryption
  encStorage.getMeta = (key, ...args) =>
    storage.getMeta(encryptKeys ? encryptStorageKey(normalizeKey(key), encryptionKey) : key, ...args);

  // TODO: Meta encryption
  encStorage.removeMeta = (key, ...args) =>
    storage.removeMeta(encryptKeys ? encryptStorageKey(normalizeKey(key), encryptionKey) : key, ...args);

  encStorage.getKeys = async (base, ...args) => {
    const keys = await storage.getKeys('', ...args);
    const decryptedKeys = keys.map((key) => decryptStorageKey(key, encryptionKey));
    if (base) {
      return decryptedKeys.filter((key) => key.startsWith(base!) && !key.endsWith("$"));
    }
    return decryptedKeys.filter((key) => !key.endsWith("$"));
  };

  return encStorage;
}

export function normalizeKey(key?: string) {
  // Don't normalize encrypted keys
  if (key?.startsWith("$enc:")) {
    return key;
  }
  if (!key) {
    return "";
  }
  return key
    .split("?")[0]
    .replace(/[/\\]/g, ":")
    .replace(/:+/g, ":")
    .replace(/^:|:$/g, "");
}

export function joinKeys(...keys: string[]) {
  return normalizeKey(keys.join(":"));
}

export function normalizeBaseKey(base?: string) {
  base = normalizeKey(base);
  return base ? base + ":" : "";
}
