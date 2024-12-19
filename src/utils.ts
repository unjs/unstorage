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
      // Remove Prefix
      .then((keys) => keys.map((key) => key.slice(base.length)));

  return nsStorage;
}

export function normalizeKey(key?: string) {
  if (!key) {
    return "";
  }
  return (
    key
      .split("?")[0]
      ?.replace(/[/\\]/g, ":")
      .replace(/:+/g, ":")
      .replace(/^:|:$/g, "") || ""
  );
}

export function joinKeys(...keys: string[]) {
  return normalizeKey(keys.join(":"));
}

export function normalizeBaseKey(base?: string) {
  base = normalizeKey(base);
  return base ? base + ":" : "";
}
