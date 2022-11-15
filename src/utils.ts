import type { Storage } from "./types";

type StorageKeys = Array<keyof Storage>

const storageKeyProperties: StorageKeys = [
  "hasItem",
  "getItem",
  "setItem",
  "removeItem",
  "getMeta",
  "setMeta",
  "removeMeta",
  "getKeys",
  "clear",
  "mount",
  "unmount"
];

export function prefixStorage (storage: Storage, base: string) {
  base = normalizeBaseKey(base);
  if (!base) {
    return storage;
  }
  const nsStorage: Storage = { ...storage };
  for (const property of storageKeyProperties) {
    // @ts-ignore Better types?
    nsStorage[property] = (key: string = "", ...arguments_) => storage[property](base + key, ...arguments_);
  }
  nsStorage.getKeys = (key: string = "", ...arguments_) =>
    storage
      .getKeys(base + key, ...arguments_)
      // Remove Prefix
      .then(keys => keys.map(key => key.slice(base.length)));

  return nsStorage;
}

export function normalizeKey (key?: string) {
  if (!key) { return ""; }
  return key.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "");
}

export function joinKeys (...keys: string[]) {
  return normalizeKey(keys.join(":"));
}

export function normalizeBaseKey (base?: string) {
  base = normalizeKey(base);
  return base ? (base + ":") : "";
}
