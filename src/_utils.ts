import { subtle, getRandomValues } from "uncrypto";
import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { siv } from '@noble/ciphers/aes';

type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;
type Promisified<T> = Promise<Awaited<T>>;

export function wrapToPromise<T>(value: T) {
  if (!value || typeof (value as any).then !== "function") {
    return Promise.resolve(value) as Promisified<T>;
  }
  return value as unknown as Promisified<T>;
}

export function asyncCall<T extends (...arguments_: any) => any>(
  function_: T,
  ...arguments_: any[]
): Promisified<ReturnType<T>> {
  try {
    return wrapToPromise(function_(...arguments_));
  } catch (error) {
    return Promise.reject(error);
  }
}

function isPrimitive(value: any) {
  const type = typeof value;
  return value === null || (type !== "object" && type !== "function");
}

function isPureObject(value: any) {
  const proto = Object.getPrototypeOf(value);
  // eslint-disable-next-line no-prototype-builtins
  return !proto || proto.isPrototypeOf(Object);
}

export function stringify(value: any): string {
  if (isPrimitive(value)) {
    return String(value);
  }

  if (isPureObject(value) || Array.isArray(value)) {
    return JSON.stringify(value);
  }

  if (typeof value.toJSON === "function") {
    return stringify(value.toJSON());
  }

  throw new Error("[unstorage] Cannot stringify value!");
}

function checkBufferSupport() {
  if (typeof Buffer === undefined) {
    throw new TypeError("[unstorage] Buffer is not supported!");
  }
}

export const BASE64_PREFIX = "base64:";

export function serializeRaw(value: any) {
  if (typeof value === "string") {
    return value;
  }
  checkBufferSupport();
  const base64 = Buffer.from(value).toString("base64");
  return BASE64_PREFIX + base64;
}

export function deserializeRaw(value: any) {
  if (typeof value !== "string") {
    // Return non-strings as-is
    return value;
  }
  if (!value.startsWith(BASE64_PREFIX)) {
    // Return unknown strings as-is
    return value;
  }
  checkBufferSupport();
  return Buffer.from(value.slice(BASE64_PREFIX.length), "base64");
}

// Encryption

// Use only for GCM-SIV, due to nonce-misuse-resistance. We need deterministic keys.
const predefinedSivNonce = 'ThtnxLK9eCF4OLMg';
const encryptionPrefix = '$enc:';

export interface StorageValueEnvelope {
  nonce: string;
  encryptedValue: string;
}

export function generateEncryptionKey() {
  return genBase64FromBytes(getRandomValues(new Uint8Array(32)));
}

export async function generateRsaKeyPair() {
  const keyPair = await subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ['encrypt', 'decrypt']);
  return {
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
  };
}

export function encryptStorageValue(storageValue: any, key: string, raw?: boolean): StorageValueEnvelope {
  const cryptoKey = genBytesFromBase64(key);
  const nonce = getRandomValues(new Uint8Array(24));
  const chacha = xchacha20poly1305(cryptoKey, nonce);
  const encryptedValue = chacha.encrypt(raw ? storageValue : new TextEncoder().encode(storageValue));
  return {
    encryptedValue: genBase64FromBytes(new Uint8Array(encryptedValue)),
    nonce: genBase64FromBytes(nonce),
  };
}

export function decryptStorageValue<T>(storageValue: StorageValueEnvelope, key: string, raw?: boolean): T {
  const { encryptedValue, nonce } = storageValue;
  const cryptoKey = genBytesFromBase64(key);
  const chacha = xchacha20poly1305(cryptoKey, genBytesFromBase64(nonce));
  const decryptedValue = chacha.decrypt(genBytesFromBase64(encryptedValue));
  return raw ? decryptedValue as T : new TextDecoder().decode(decryptedValue) as T;
}

export function encryptStorageKey(storageKey: string, key: string) {
  const cryptoKey = genBytesFromBase64(key);
  const gcmSiv = siv(cryptoKey, genBytesFromBase64(predefinedSivNonce));
  const encryptedKey = gcmSiv.encrypt(new Uint8Array(new TextEncoder().encode(storageKey)));
  return encryptionPrefix + genBase64FromBytes(encryptedKey);
}

export function decryptStorageKey(encryptedKey: string, key: string) {
  const cryptoKey = genBytesFromBase64(key);
  const gcmSiv = siv(cryptoKey, genBytesFromBase64(predefinedSivNonce));
  const decryptedKey = gcmSiv.decrypt(genBytesFromBase64(encryptedKey.slice(encryptionPrefix.length)));
  return new TextDecoder().decode(decryptedKey);
}

// Base64 utilities - Waiting for https://github.com/unjs/knitwork/pull/83 // TODO: Replace with knitwork imports as soon as PR is merged

function genBytesFromBase64(input: string) {
  return Uint8Array.from(
    globalThis.atob(input),
    (c) => c.codePointAt(0) as number
  );
}

function genBase64FromBytes(input: Uint8Array, urlSafe?: boolean) {
  if (urlSafe) {
    return globalThis
      .btoa(String.fromCodePoint(...input))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
  return globalThis.btoa(String.fromCodePoint(...input));
}
