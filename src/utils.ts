import type { Storage, StorageValue } from "./types";

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

  if (typeof storage.getItems === "function") {
    nsStorage.getItems = <U extends T>(
      items: (string | { key: string; options?: any })[],
      commonOptions?: any
    ) => {
      const prefixedItems = items.map((item) => {
        if (typeof item === "string") {
          return base + item;
        } else {
          return {
            key: base + item.key,
            options: item.options,
          };
        }
      });
      return storage.getItems<U>(prefixedItems, commonOptions).then((results) =>
        results.map((entry) => ({
          key: entry.key.slice(base.length),
          value: entry.value,
        }))
      );
    };
  }

  if (typeof storage.setItems === "function") {
    nsStorage.setItems = <U extends T>(
      items: { key: string; value: U; options?: any }[],
      commonOptions?: any
    ) => {
      const prefixedItems = items.map((item) => ({
        key: base + item.key,
        value: item.value,
        options: item.options,
      }));
      return storage.setItems<U>(prefixedItems, commonOptions);
    };
  }

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

export function filterKeyByDepth(
  key: string,
  depth: number | undefined
): boolean {
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

export function filterKeyByBase(
  key: string,
  base: string | undefined
): boolean {
  if (base) {
    return key.startsWith(base) && key[key.length - 1] !== "$";
  }

  return key[key.length - 1] !== "$";
}
