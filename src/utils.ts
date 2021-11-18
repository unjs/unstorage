import type { Storage } from './types'
import { normalizeBase } from './_utils'

const storageKeyProps: (keyof Storage)[] = [
  'hasItem',
  'getItem',
  'setItem',
  'removeItem',
  'getMeta',
  'setMeta',
  'removeMeta',
  'getKeys',
  'clear',
  'mount',
  'unmount'
]

export function prefixStorage (storage: Storage, base: string): Storage {
  base = normalizeBase(base)
  if (!base) {
    return storage
  }
  const nsStorage: Storage = { ...storage }
  for (const prop of storageKeyProps) {
    // @ts-ignore Better types?
    nsStorage[prop] = (key: string = '', ...args) => storage[prop](base + key, ...args)
  }
  nsStorage.getKeys = (key: string = '', ...args) =>
    storage
      .getKeys(base + key, ...args)
      // Remove Prefix
      .then(keys => keys.map(key => key.substr(base.length)))

  return nsStorage
}
