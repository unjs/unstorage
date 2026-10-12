import type { Storage, StorageValue, TransactionOptions } from "./types";

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

const nonItemKeyProperties = new Set<keyof Storage>([
  "getKeys",
  "clear",
  "mount",
  "unmount",
]);

export function prefixStorage<T extends StorageValue>(
  storage: Storage<T> | Storage<any>,
  base: string
): Storage<T>;
export function prefixStorage<T extends StorageValue>(
  storage: Storage<T>,
  base: string
): Storage<T> {
  base = normalizeBaseKey(base);
  if (!base) {
    return storage;
  }
  // An empty key would target the item named exactly `base` in the parent
  const itemKey = (key: string) => {
    if (!normalizeKey(key)) {
      throw new Error(`[unstorage] Invalid key: ${JSON.stringify(key)}`);
    }
    return base + key;
  };
  const nsStorage: Storage<T> = { ...storage };
  for (const property of storageKeyProperties) {
    // @ts-ignore
    nsStorage[property] = nonItemKeyProperties.has(property)
      ? (key: string = "", ...args: any[]) =>
          // @ts-ignore
          storage[property](base + key, ...args)
      : async (key: string = "", ...args: any[]) =>
          // @ts-ignore
          storage[property](itemKey(key), ...args);
  }
  nsStorage.getKeys = (key = "", ...arguments_) =>
    storage
      .getKeys(base + key, ...arguments_)
      // Remove Prefix
      .then((keys) => keys.map((key) => key.slice(base.length)));

  nsStorage.keys = nsStorage.getKeys;

  nsStorage.getItems = async <U extends T>(
    items: (string | { key: string; options?: TransactionOptions })[],
    commonOptions?: TransactionOptions
  ) => {
    const prefixedItems = items.map((item) =>
      typeof item === "string"
        ? itemKey(item)
        : { ...item, key: itemKey(item.key) }
    );
    const results = await storage.getItems<U>(prefixedItems, commonOptions);
    return results.map((entry) => ({
      key: entry.key.slice(base.length),
      value: entry.value,
    }));
  };

  nsStorage.setItems = async <U extends T>(
    items: { key: string; value: U; options?: TransactionOptions }[],
    commonOptions?: TransactionOptions
  ) => {
    const prefixedItems = items.map((item) => ({
      key: itemKey(item.key),
      value: item.value,
      options: item.options,
    }));
    return storage.setItems<U>(prefixedItems, commonOptions);
  };

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

/**
 * Check if a normalized key has `.` or `..` segments, which drivers mapping
 * keys to paths or URLs would resolve (and could escape their base with)
 */
export function hasDotSegment(key: string): boolean {
  return key.split(":").some((segment) => segment === "." || segment === "..");
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
