import type { Storage } from './types'

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
  base = normalizeBaseKey(base)
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

export function normalizeKey (key: string | undefined): string {
  if (!key) { return '' }
  return key.replace(/[/\\]/g, ':').replace(/:+/g, ':').replace(/^:|:$/g, '')
}

export function joinKeys (...keys: string[]) {
  return normalizeKey(keys.join(':'))
}

export function normalizeBaseKey (base: string | undefined): string {
  base = normalizeKey(base)
  return base ? (base + ':') : ''
}
