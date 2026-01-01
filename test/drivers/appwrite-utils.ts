import type { AppwriteStorageKeyOptions } from "unstorage/drivers/utils/appwrite";
import basex from "base-x";

const base62 = basex(
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
);
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const ID_SEPARATOR = "_" as const;

export const keyOptions = {
  encodeKey(key, keySeparator) {
    return key
      .split(keySeparator)
      .map((part) => {
        return base62.encode(textEncoder.encode(part));
      })
      .join(ID_SEPARATOR);
  },
  decodeKey(fileId, keySeparator) {
    return fileId
      .split(ID_SEPARATOR)
      .map((part) => {
        return textDecoder.decode(base62.decode(part));
      })
      .join(keySeparator);
  },
} satisfies AppwriteStorageKeyOptions;
