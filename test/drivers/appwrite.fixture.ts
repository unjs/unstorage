import type { AppwriteStorageKeyOptions } from "unstorage/drivers/utils/appwrite";
import basex from "base-x";

/**
 * Base62 encoding/decoding instance for Appwrite file/row IDs.
 * Uses characters 0-9, a-z, and A-Z for encoding.
 */
const base62 = basex(
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
);
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const ID_SEPARATOR = "_" as const;

export const keyOptions = {
  /**
   * Encodes a storage key to an Appwrite file ID using base62 encoding.
   * Splits the key by the separator, encodes each part, and joins with underscore.
   *
   * @param key - The storage key to encode
   * @param keySeparator - The separator character used in key paths
   * @returns The encoded file ID
   * @example
   * ```typescript
   * encodeKey("path/to/file", "/") // returns "23B5LG_7KL_1Shkqh"
   * ```
   */
  encodeKey(key, keySeparator) {
    return key
      .split(keySeparator)
      .map((part) => {
        return base62.encode(textEncoder.encode(part));
      })
      .join(ID_SEPARATOR);
  },
  /**
   * Decodes an Appwrite file ID back to a storage key using base62 decoding.
   * Splits the file ID by underscore, decodes each part, and joins with the original separator.
   *
   * @param fileId - The file ID to decode
   * @param keySeparator - The separator character used in key paths
   * @returns The decoded storage key
   * @example
   * ```typescript
   * decodeKey("23B5LG_7KL_1Shkqh", "/") // returns "path/to/file"
   * ```
   */
  decodeKey(fileId, keySeparator) {
    return fileId
      .split(ID_SEPARATOR)
      .map((part) => {
        return textDecoder.decode(base62.decode(part));
      })
      .join(keySeparator);
  },
} satisfies AppwriteStorageKeyOptions;
