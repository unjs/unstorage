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

  if (isPureObject(value)) {
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

export function serializeRaw(value) {
  if (typeof value === "string") {
    return value;
  }
  checkBufferSupport();
  const base64 = Buffer.from(value).toString("base64");
  return BASE64_PREFIX + base64;
}

export function deserializeRaw(value) {
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
