import type { Driver } from '../../types'

type DriverFactory<T> = (opts?: T) => Driver

export function defineDriver<T = any>(factory: DriverFactory<T>): DriverFactory<T> {
  return factory
}

export function isPrimitive (arg: any) {
  const type = typeof arg
  return arg === null || (type !== 'object' && type !== 'function')
}

export function stringify (arg: any) {
  return isPrimitive(arg) ? (arg + '') : JSON.stringify(arg)
}

export function normalizeKey (key: string | undefined): string {
  if (!key) { return '' }
  return key.replace(/[/\\]/g, ':').replace(/^:|:$/g, '')
}
