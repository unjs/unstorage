import { subtle, getRandomValues } from "uncrypto";

type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;
type Promisified<T> = Promise<Awaited<T>>;

type EncryptStorageOptions = Omit<EncryptionOptions, 'key' | 'iv'> & {
  key: string;
  encryptKeys?: boolean;
};

type DecryptStorageOptions = Omit<EncryptionOptions, 'key' | 'iv'> & {
  key: string;
  decryptKeys?: boolean;
};

interface EncryptionOptions {
  key: CryptoKey;
  algorithm: "AES-GCM" | "AES-CBC" | "RSA-OAEP";
  iv?: Uint8Array;
  raw?: boolean;
}

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

export interface StorageValueEnvelope {
  iv: string;
  encryptedValue: string;
}

export async function generateAesKey(algorithm: "AES-GCM" | "AES-CBC" = "AES-GCM") {
  return genBase64FromBytes(
    new Uint8Array(
      await subtle.exportKey(
        'raw', await subtle.generateKey(
          {
            name: algorithm,
            length: 256,
          },
          true,
          ['encrypt', 'decrypt'])
      )
    )
  );
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

export async function encryptStorageValue(storageValue: any, options: EncryptStorageOptions) {
  const { key, algorithm, raw } = options;
  const cryptoKey = await subtle.importKey('raw', genBytesFromBase64(key), {
    name: "AES-GCM",
    length: 256
  }, true, ['encrypt', 'decrypt']);
  const iv = getRandomValues(new Uint8Array(12));
  const encryptedValue = await encryptSym(storageValue, { key: cryptoKey, algorithm, raw, iv });
  return {
    encryptedValue,
    iv: genBase64FromBytes(iv),
  };
}

export async function decryptStorageValue<T>(storageValue: StorageValueEnvelope, options: DecryptStorageOptions): Promise<T> {
  const { key, algorithm, raw } = options;
  const { encryptedValue, iv } = storageValue;
  const cryptoKey = await subtle.importKey('raw', genBytesFromBase64(key), {
    name: "AES-GCM",
    length: 256
  }, true, ['encrypt', 'decrypt']);
  const decrypted = await decryptSym(encryptedValue, { key: cryptoKey, algorithm, raw, iv: genBytesFromBase64(iv) });
  return decrypted as T;
}

export async function encryptStorageKey(storageKey: string, options: EncryptStorageOptions) {
  const { key, algorithm, raw } = options;
  const cryptoKey = await subtle.importKey('raw', genBytesFromBase64(key), {
    name: "AES-GCM",
    length: 256
  }, true, ['encrypt', 'decrypt']);
  return await encryptSym(storageKey, { key: cryptoKey, algorithm, raw, iv: new Uint8Array(12) });
}

export async function decryptStorageKey(encryptedKey: string, options: DecryptStorageOptions) {
  const { key, algorithm } = options;
  const cryptoKey = await subtle.importKey('raw', genBytesFromBase64(key), {
    name: "AES-GCM",
    length: 256
  }, true, ['encrypt', 'decrypt']);
  const decrypted = await decryptSym(encryptedKey, { key: cryptoKey, algorithm, iv: new Uint8Array(12) });
  return decrypted as string;
}

async function encryptSym(content: any, options: EncryptionOptions) {
  if (options.raw) {
    return genBase64FromBytes(new Uint8Array(await subtle.encrypt(
      {
        name: options.algorithm,
        iv: options.iv,
      },
      options.key,
      content
    )));
  }
  const encoded = new TextEncoder().encode(content);
  const ciphertext = await subtle.encrypt(
    {
      name: options.algorithm,
      iv: options.iv,
    },
    options.key,
    encoded
  );
  return genBase64FromBytes(new Uint8Array(ciphertext));
}

async function encryptAsym(content: any, options: EncryptionOptions) {
  if (options.raw) {
    return await subtle.encrypt(
      {
        name: options.algorithm,
      },
      options.key,
      content
    );
  }
  const encoded = new TextEncoder().encode(content);
  const ciphertext = await subtle.encrypt(
    {
      name: options.algorithm,
    },
    options.key,
    encoded
  );
  return genBase64FromBytes(new Uint8Array(ciphertext));
}

async function decryptSym(content: any, options: EncryptionOptions) {
  const decoded = genBytesFromBase64(content);
  if (options.raw) {
    return await subtle.decrypt(
      {
        name: options.algorithm,
        iv: options.iv,
      },
      options.key,
      decoded
    );
  }
  const decrypted = await subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: options.iv,
    },
    options.key,
    decoded
  );
  return new TextDecoder().decode(decrypted);
}

async function decryptAsym(content: any, options: EncryptionOptions) {
  if (options.raw) {
    return await subtle.decrypt(
      {
        name: options.algorithm,
      },
      options.key,
      content
    );
  }

  const decoded = genBytesFromBase64(content);

  return await subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: options.iv,
    },
    options.key,
    decoded
  );
}

// Base64 utilities - Waiting for https://github.com/unjs/knitwork/pull/83 // TODO: Replace with knitwork imports as soon as PR is merged

interface CodegenOptions {
  encoding?: 'utf8' | 'ascii' | 'url';
}

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

function genBase64FromString(
  input: string,
  options: CodegenOptions = {}
) {
  if (options.encoding === 'utf8') {
    return genBase64FromBytes(new TextEncoder().encode(input));
  }
  if (options.encoding === 'url') {
    return genBase64FromBytes(new TextEncoder().encode(input))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
  return globalThis.btoa(input);
}

function genStringFromBase64(
  input: string,
  options: CodegenOptions = {}
) {
  if (options.encoding === 'utf8') {
    return new TextDecoder().decode(genBytesFromBase64(input));
  }
  if (options.encoding === 'url') {
    input = input.replace(/-/g, '+').replace(/_/g, '/');
    const paddingLength = input.length % 4;
    if (paddingLength === 2) {
      input += '==';
    } else if (paddingLength === 3) {
      input += '=';
    }
    return new TextDecoder().decode(genBytesFromBase64(input));
  }
  return globalThis.atob(input);
}
