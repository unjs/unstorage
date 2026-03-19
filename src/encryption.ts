import { xchacha20poly1305 } from "@noble/ciphers/chacha";
import { siv } from "@noble/ciphers/aes";
import destr from "destr";
import { stringify } from "./_utils.ts";
import type { Storage, StorageValue, TransactionOptions } from "./types.ts";
import { normalizeKey } from "./utils.ts";

export interface EncryptedStorageOptions {
  encryptionKey: string;
  encryptKeys?: boolean;
}

export function encryptedStorage<T extends StorageValue>(
  storage: Storage<T>,
  options: EncryptedStorageOptions,
): Storage<T> {
  const { encryptionKey, encryptKeys = false } = options;
  const encStorage: Storage<T> = { ...storage };

  const getStoredKey = (key: string) =>
    encryptKeys ? _encryptStorageKey(normalizeKey(key), encryptionKey) : key;

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
    return value === null ? null : destr(_decryptStorageValue<string>(value, encryptionKey));
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
    return value === null ? null : _decryptStorageValue(value, encryptionKey, true);
  };

  encStorage.setItem = async (key, value, ...args) => {
    const encryptedValue = _encryptStorageValue(stringify(value), encryptionKey);
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
    const encryptedValue = _encryptStorageValue(value, encryptionKey, true);
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
    const decryptedKeys = keys.map((key) => _decryptStorageKey(key, encryptionKey));

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

// --- Internal helpers ---

interface StorageValueEnvelope {
  nonce: string;
  encryptedValue: string;
}

// Use only for GCM-SIV, due to nonce-misuse-resistance. We need deterministic keys.
const _predefinedSivNonce = "ThtnxLK9eCF4OLMg";
const _encryptionPrefix = "$enc:";

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

function _encryptStorageKey(storageKey: string, key: string): string {
  const cryptoKey = _genBytesFromBase64(key);
  const gcmSiv = siv(cryptoKey, _genBytesFromBase64(_predefinedSivNonce));
  const encryptedKey = gcmSiv.encrypt(new Uint8Array(new TextEncoder().encode(storageKey)));
  return _encryptionPrefix + _genBase64FromBytes(encryptedKey, true);
}

function _decryptStorageKey(encryptedKey: string, key: string): string {
  const cryptoKey = _genBytesFromBase64(key);
  const gcmSiv = siv(cryptoKey, _genBytesFromBase64(_predefinedSivNonce));
  const decryptedKey = gcmSiv.decrypt(
    _genBytesFromBase64(encryptedKey.slice(_encryptionPrefix.length), true),
  );
  return new TextDecoder().decode(decryptedKey);
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
  if (urlSafe) {
    return globalThis
      .btoa(String.fromCodePoint(...input))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
  return globalThis.btoa(String.fromCodePoint(...input));
}
