type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;
type Promisified<T> = Promise<Awaited<T>>;

export function wrapToPromise<T>(value: T): Promisified<T> {
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

export const BASE64_PREFIX = "base64:";

export function serializeRaw(value: any): string {
  if (typeof value === "string") {
    return value;
  }
  return BASE64_PREFIX + base64Encode(value);
}

export function deserializeRaw(value: any): any {
  if (typeof value !== "string") {
    // Return non-strings as-is
    return value;
  }
  if (!value.startsWith(BASE64_PREFIX)) {
    // Return unknown strings as-is
    return value;
  }
  return base64Decode(value.slice(BASE64_PREFIX.length));
}

function base64Decode(input: string) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(input, "base64");
  }
  return Uint8Array.from(globalThis.atob(input), (c) => c.codePointAt(0) as number);
}

function base64Encode(input: Uint8Array) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(input).toString("base64");
  }
  return globalThis.btoa(String.fromCodePoint(...input));
}

/**
 * Normalizes the possible raw values that drivers might emit to an `Uint8Array`.
 *
 * Supported inputs: `Uint8Array` (and `Buffer`), `ArrayBuffer`, `ArrayBufferView`,
 * `string`, `Blob` (and any `.arrayBuffer()` like `Response`), `ReadableStream`
 * and async iterables (Node.js streams).
 */
export async function toBytes(value: any): Promise<Uint8Array> {
  if (typeof value === "string") {
    return new TextEncoder().encode(value);
  }
  if (ArrayBuffer.isView(value)) {
    // Normalize Buffer, DataView and other typed arrays to a plain Uint8Array view (no copy)
    return value.constructor === Uint8Array
      ? (value as Uint8Array)
      : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (typeof value?.arrayBuffer === "function") {
    // Blob and Response like
    return new Uint8Array(await value.arrayBuffer());
  }
  if (
    typeof value?.getReader === "function" ||
    typeof value?.[Symbol.asyncIterator] === "function"
  ) {
    return concatBytes(await readChunks(value));
  }
  throw new TypeError(`[unstorage] Cannot convert \`${typeName(value)}\` to bytes.`);
}

/**
 * Normalizes the possible raw values that drivers might emit to a `Blob`.
 *
 * @see {@link toBytes} for the supported inputs.
 */
export async function toBlob(value: any): Promise<Blob> {
  if (value instanceof Blob) {
    return value;
  }
  return new Blob([(await toBytes(value)) as BlobPart]);
}

/**
 * Normalizes the possible raw values that drivers might emit to a `ReadableStream`.
 *
 * Streams and blobs are passed through without buffering their contents.
 *
 * @see {@link toBytes} for the supported inputs.
 */
export async function toStream(value: any): Promise<ReadableStream<Uint8Array>> {
  if (value instanceof ReadableStream) {
    return value;
  }
  if (value instanceof Blob) {
    return value.stream();
  }
  const bytes = await toBytes(value);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

async function readChunks(value: any): Promise<Uint8Array[]> {
  const chunks: Uint8Array[] = [];
  if (typeof value.getReader === "function") {
    const reader = value.getReader();
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) {
        break;
      }
      chunks.push(await toBytes(chunk));
    }
  } else {
    for await (const chunk of value) {
      chunks.push(await toBytes(chunk));
    }
  }
  return chunks;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  if (chunks.length === 1) {
    return chunks[0]!;
  }
  const bytes = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

function typeName(value: any): string {
  return value?.constructor?.name || typeof value;
}
