export function normalizeKey (key: string) {
  return key.replace(/[/\\]/g, ':').replace(/^:|:$/g, '')
}

type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;
type Promisified<T> = Promise<Awaited<T>>

export function wrapToPromise<T> (val: T): Promisified<T> {
  if (!val || typeof (val as any).then !== 'function') {
    return Promise.resolve(val) as Promisified<T>
  }
  return val as unknown as Promisified<T>
}

export function asyncCall<T extends (...args: any) => any>(fn: T, ...args: any[]): Promisified<ReturnType<T>> {
  try {
    return wrapToPromise(fn(...args))
  } catch (err) {
    return Promise.reject(err)
  }
}
