import type { Driver } from '../../types'

export function defineDriver<T = any>(factory: (opts?: T) => Driver) {
  return factory
}
