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

  encStorage.setItem = async (key, value, ...args) => {
    if (encryptKeys) {
      key = await encryptStorageKey(key, { algorithm: "AES-GCM", key: encryptionKey });
    }
    const encryptedValue = await encryptStorageValue(stringify(value), { algorithm: "AES-GCM", key: encryptionKey });
    storage.setItem(key, encryptedValue as T, ...args);
  };

  encStorage.setItemRaw = async (key, value, ...args) => {
    const encryptedValue = await encryptStorageValue(value, { algorithm: "AES-GCM", key: encryptionKey, raw: true });
    storage.setItem(key, encryptedValue as T, ...args);
  };

  encStorage.getItem = async (key, ...args) => {
    if (encryptKeys) {
      key = await decryptStorageKey(key, { algorithm: "AES-GCM", key: encryptionKey });
    }
    const value = await storage.getItem(key, ...args);
    return value ? destr(await decryptStorageValue(value as StorageValueEnvelope, { algorithm: "AES-GCM", key: encryptionKey })) : null;
  };

  encStorage.getItemRaw = async (key, ...args) => {
    const value = await storage.getItem(key, ...args);
    return value ? await decryptStorageValue(value as StorageValueEnvelope, { algorithm: "AES-GCM", key: encryptionKey, raw: true }) : null;
  };

  encStorage.getItems = async (items, ...args) => {
    const encryptedItems = await storage.getItems(items, ...args);
    return await Promise.all(encryptedItems.map(async (encryptedItem) => {
      const { value, ...rest } = encryptedItem;
      const decryptedValue = (await decryptStorageValue(value as StorageValueEnvelope, { algorithm: "AES-GCM", key: encryptionKey })) as StorageValue;
      return { value: decryptedValue, ...rest };
    }));
  };

  encStorage.setItems = async (items, ...args) => {
    const encryptedItems = await Promise.all(items.map(async (item) => {
      const { value, ...rest } = item;
      const encryptedValue: StorageValueEnvelope = await encryptStorageValue(stringify(value), { algorithm: "AES-GCM", key: encryptionKey });
      return { value: encryptedValue, ...rest };
    }));
    storage.setItems<StorageValueEnvelope>(encryptedItems, ...args);
  };

  return encStorage;
}

export function normalizeKey(key?: string) {
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
