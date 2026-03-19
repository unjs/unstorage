import { xchacha20poly1305 } from "@noble/ciphers/chacha";
import { siv } from "@noble/ciphers/aes";
import destr from "destr";
import { stringify } from "./_utils.ts";
import type { Storage, StorageValue, TransactionOptions } from "./types.ts";
import { normalizeKey } from "./utils.ts";

export interface EncryptedStorageOptions {
  /**
   * Base64-encoded encryption secret(s) (each must decode to exactly 32 bytes / 256-bit). First is used as primary, rest are older ones for key rotation.
   */
  secret: string | string[];

  /** Encrypt storage keys in addition to values. */
  encryptKeys?: {
    /** Nonce for AES-GCM-SIV key encryption (base64-encoded, must be 12 bytes). */
    nonce: string;

    /** Custom prefix for encrypted keys (default: `"$enc:"`). */
    prefix?: string;
  };
}

export function encryptedStorage<T extends StorageValue>(
  storage: Storage<T>,
  options: EncryptedStorageOptions,
): Storage<T> {
  const { encryptKeys } = options;

  const allSecrets = Array.isArray(options.secret)
    ? options.secret
    : options.secret.split(",").map((s) => s.trim());
  const secret = allSecrets[0]!;
  const encryptedKeyPrefix = encryptKeys?.prefix || _defaultEncryptionPrefix;

  // Validate all key lengths eagerly
  for (const s of allSecrets) {
    _validateKeyLength(s);
  }
  if (encryptKeys) {
    _validateSivNonceLength(encryptKeys.nonce);
  }

  const encStorage: Storage<T> = { ...storage };

  const getStoredKey = (key: string) =>
    encryptKeys
      ? _encryptStorageKey(normalizeKey(key), secret, encryptKeys.nonce, encryptedKeyPrefix)
      : key;

  const getItemOptions = (
    item: string | { key: string; options?: TransactionOptions },
    commonOptions?: TransactionOptions,
  ) => {
    return typeof item === "string" || !item.options
      ? commonOptions
      : { ...commonOptions, ...item.options };
  };

  encStorage.hasItem = (key, ...args) => storage.hasItem(getStoredKey(key), ...args);

  encStorage.getItem = (async (key, ...args) => {
    const value = await storage.getItem<StorageValueEnvelope>(getStoredKey(key), ...args);
    return value === null ? null : destr(_decryptWithFallback<string>(value, allSecrets));
  }) as Storage<T>["getItem"];

  encStorage.getItems = (async (items, commonOptions) => {
    return Promise.all(
      items.map(async (item) => {
        const key = typeof item === "string" ? item : item.key;
        return {
          key: normalizeKey(key),
          value: await encStorage.getItem(key, getItemOptions(item, commonOptions)),
        };
      }),
    );
  }) as Storage<T>["getItems"];

  encStorage.getItemRaw = async (key, ...args) => {
    const value = await storage.getItem<StorageValueEnvelope>(getStoredKey(key), ...args);
    return value === null ? null : _decryptWithFallback(value, allSecrets, true);
  };

  encStorage.setItem = async (key, value, ...args) => {
    const encryptedValue = _encryptStorageValue(stringify(value), secret);
    return storage.setItem(getStoredKey(key), encryptedValue as unknown as T, ...args);
  };

  encStorage.setItems = async (items, commonOptions) => {
    await Promise.all(
      items.map((item) =>
        encStorage.setItem(item.key, item.value, getItemOptions(item, commonOptions)),
      ),
    );
  };

  encStorage.setItemRaw = async (key, value, ...args) => {
    const encryptedValue = _encryptStorageValue(value, secret, true);
    return storage.setItem(getStoredKey(key), encryptedValue as unknown as T, ...args);
  };

  encStorage.removeItem = (key, ...args) => storage.removeItem(getStoredKey(key), ...args);
  encStorage.setMeta = (key, ...args) => storage.setMeta(getStoredKey(key), ...args);
  encStorage.getMeta = (key, ...args) => storage.getMeta(getStoredKey(key), ...args);
  encStorage.removeMeta = (key, ...args) => storage.removeMeta(getStoredKey(key), ...args);

  encStorage.getKeys = async (base, ...args) => {
    if (!encryptKeys) {
      return storage.getKeys(base, ...args);
    }

    const normalizedBase = normalizeKey(base);
    const keys = await storage.getKeys("", ...args);
    const decryptedKeys = keys.map((key) =>
      _decryptKeyWithFallback(key, allSecrets, encryptKeys.nonce, encryptedKeyPrefix),
    );

    return normalizedBase
      ? decryptedKeys.filter((key) => key.startsWith(normalizedBase))
      : decryptedKeys;
  };

  encStorage.keys = encStorage.getKeys;
  encStorage.get = (key, opts = {}) => encStorage.getItem(key, opts);
  encStorage.set = (key, value, opts = {}) => encStorage.setItem(key, value, opts);
  encStorage.has = (key, opts = {}) => encStorage.hasItem(key, opts);
  encStorage.del = (key, opts = {}) => encStorage.removeItem(key, opts);
  encStorage.remove = (key, opts = {}) => encStorage.removeItem(key, opts);

  return encStorage;
}

// --- Internal types ---

interface StorageValueEnvelope {
  nonce: string;
  encryptedValue: string;
}

// --- Internal helpers ---

const _defaultEncryptionPrefix = "$enc:";

function _validateKeyLength(base64Key: string): void {
  const bytes = _genBytesFromBase64(base64Key);
  if (bytes.length !== 32) {
    throw new Error(
      `Encryption key must be exactly 32 bytes (256-bit), got ${bytes.length} bytes.`,
    );
  }
}

function _validateSivNonceLength(base64Nonce: string): void {
  const bytes = _genBytesFromBase64(base64Nonce);
  if (bytes.length !== 12) {
    throw new Error(`SIV nonce must be exactly 12 bytes, got ${bytes.length} bytes.`);
  }
}

function _encryptStorageValue(storageValue: any, key: string, raw?: boolean): StorageValueEnvelope {
  const cryptoKey = _genBytesFromBase64(key);
  const nonce = globalThis.crypto.getRandomValues(new Uint8Array(24));
  const chacha = xchacha20poly1305(cryptoKey, nonce);
  const encryptedValue = chacha.encrypt(
    raw ? storageValue : new TextEncoder().encode(storageValue),
  );
  return {
    encryptedValue: _genBase64FromBytes(new Uint8Array(encryptedValue)),
    nonce: _genBase64FromBytes(nonce),
  };
}

function _decryptStorageValue<T>(
  storageValue: StorageValueEnvelope,
  key: string,
  raw?: boolean,
): T {
  const { encryptedValue, nonce } = storageValue;
  const cryptoKey = _genBytesFromBase64(key);
  const chacha = xchacha20poly1305(cryptoKey, _genBytesFromBase64(nonce));
  const decryptedValue = chacha.decrypt(_genBytesFromBase64(encryptedValue));
  return raw ? (decryptedValue as T) : (new TextDecoder().decode(decryptedValue) as T);
}

function _encryptStorageKey(
  storageKey: string,
  key: string,
  sivNonce: string,
  prefix: string,
): string {
  const cryptoKey = _genBytesFromBase64(key);
  const gcmSiv = siv(cryptoKey, _genBytesFromBase64(sivNonce));
  const encryptedKey = gcmSiv.encrypt(new Uint8Array(new TextEncoder().encode(storageKey)));
  return prefix + _genBase64FromBytes(encryptedKey, true);
}

function _decryptStorageKey(
  encryptedKey: string,
  key: string,
  sivNonce: string,
  prefix: string,
): string {
  const cryptoKey = _genBytesFromBase64(key);
  const gcmSiv = siv(cryptoKey, _genBytesFromBase64(sivNonce));
  const decryptedKey = gcmSiv.decrypt(_genBytesFromBase64(encryptedKey.slice(prefix.length), true));
  return new TextDecoder().decode(decryptedKey);
}

function _decryptWithFallback<T>(
  storageValue: StorageValueEnvelope,
  secrets: string[],
  raw?: boolean,
): T {
  for (let i = 0; i < secrets.length; i++) {
    try {
      return _decryptStorageValue<T>(storageValue, secrets[i]!, raw);
    } catch {
      if (i === secrets.length - 1) throw new Error("Decryption failed with all keys");
    }
  }
  throw new Error("Decryption failed: no keys provided");
}

function _decryptKeyWithFallback(
  encryptedKey: string,
  secrets: string[],
  sivNonce: string,
  prefix: string,
): string {
  if (!encryptedKey.startsWith(prefix)) {
    return encryptedKey;
  }
  for (let i = 0; i < secrets.length; i++) {
    try {
      return _decryptStorageKey(encryptedKey, secrets[i]!, sivNonce, prefix);
    } catch {
      if (i === secrets.length - 1) throw new Error("Key decryption failed with all keys");
    }
  }
  throw new Error("Key decryption failed with all keys");
}

function _genBytesFromBase64(input: string, urlSafe?: boolean) {
  if (urlSafe) {
    input = input.replace(/-/g, "+").replace(/_/g, "/");
    const paddingLength = input.length % 4;
    if (paddingLength === 2) {
      input += "==";
    } else if (paddingLength === 3) {
      input += "=";
    }
  }
  return Uint8Array.from(globalThis.atob(input), (c) => c.codePointAt(0) as number);
}

function _genBase64FromBytes(input: Uint8Array, urlSafe?: boolean) {
  let binary = "";
  for (let i = 0; i < input.length; i++) {
    binary += String.fromCodePoint(input[i]!);
  }
  if (urlSafe) {
    return globalThis.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  return globalThis.btoa(binary);
}
