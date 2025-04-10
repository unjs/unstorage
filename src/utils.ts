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

  nsStorage.getItems = async <U extends T>(
    items: (string | { key: string; options?: TransactionOptions })[],
    commonOptions?: TransactionOptions
  ) => {
    const prefixedItems = items.map((item) =>
      typeof item === "string" ? base + item : { ...item, key: base + item.key }
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
      key: base + item.key,
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

/**
 * Transform raw data into the expected type.
 */
export function transformRawToType(
  raw: any,
  type: "bytes" | "blob" | "stream"
) {
  // Handle "bytes"
  if (type === "bytes") {
    if (
      raw instanceof Uint8Array ||
      (typeof Buffer !== "undefined" && raw instanceof Buffer)
    ) {
      return raw;
    }
    if (typeof raw === "string") {
      return new TextEncoder().encode(raw);
    }
    // Try to convert ArrayBuffer
    if (raw instanceof ArrayBuffer) {
      return new Uint8Array(raw);
    }
    throw new Error("[unstorage] Cannot convert raw data to bytes");
  }

  // Handle "blob"
  if (type === "blob") {
    if (typeof Blob !== "undefined" && raw instanceof Blob) {
      return raw;
    }
    if (
      raw instanceof Uint8Array ||
      (typeof Buffer !== "undefined" && raw instanceof Buffer)
    ) {
      return new Blob([raw]);
    }
    if (typeof raw === "string") {
      return new Blob([new TextEncoder().encode(raw)]);
    }
    if (raw instanceof ArrayBuffer) {
      return new Blob([new Uint8Array(raw)]);
    }
    throw new Error("[unstorage] Cannot convert raw data to Blob");
  }

  // Handle "stream"
  if (type === "stream") {
    if (
      typeof ReadableStream !== "undefined" &&
      raw instanceof ReadableStream
    ) {
      return raw;
    }
    // Convert Uint8Array, Buffer, string, or ArrayBuffer to stream
    let uint8array: Uint8Array;
    if (
      raw instanceof Uint8Array ||
      (typeof Buffer !== "undefined" && raw instanceof Buffer)
    ) {
      uint8array = raw;
    } else if (typeof raw === "string") {
      uint8array = new TextEncoder().encode(raw);
    } else if (raw instanceof ArrayBuffer) {
      uint8array = new Uint8Array(raw);
    } else {
      throw new TypeError(
        "[unstorage] Cannot convert raw data to ReadableStream"
      );
    }

    // Create a ReadableStream from Uint8Array
    return new ReadableStream({
      start(controller) {
        controller.enqueue(uint8array);
        controller.close();
      },
    });
  }

  throw new Error("[unstorage] Unknown type for transformRawToType");
}
