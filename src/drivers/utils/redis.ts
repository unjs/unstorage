/**
 * Normalize a raw value into something redis clients can store as binary-safe data.
 */
export function normalizeValue(value: unknown): Buffer | string | number {
  const type = typeof value;
  if (type === "string" || type === "number") {
    return value as string | number;
  }
  if (Buffer.isBuffer(value)) {
    return value as Buffer;
  }
  if (isTypedArray(value)) {
    if (Buffer.copyBytesFrom) {
      return Buffer.copyBytesFrom(value, value.byteOffset, value.byteLength);
    } else {
      return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
    }
  }
  if (value instanceof ArrayBuffer) {
    return Buffer.from(value);
  }
  return JSON.stringify(value);
}

export function isTypedArray(value: unknown): value is TypedArray {
  return (
    value instanceof Int8Array ||
    value instanceof Uint8Array ||
    value instanceof Uint8ClampedArray ||
    value instanceof Int16Array ||
    value instanceof Uint16Array ||
    value instanceof Int32Array ||
    value instanceof Uint32Array ||
    value instanceof Float32Array ||
    value instanceof Float64Array ||
    value instanceof BigInt64Array ||
    value instanceof BigUint64Array
  );
}
