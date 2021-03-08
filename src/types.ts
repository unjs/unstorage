export type StorageValue = string | null

export interface Driver {
  hasItem: (key: string) => boolean | Promise<boolean>
  getItem: (key: string) => StorageValue | Promise<StorageValue>
  setItem: (key: string, value: string) => void | Promise<void>
  removeItem: (key: string) => void | Promise<void>
  getKeys: () => string[] | Promise<string[]>
  clear: () => void | Promise<void>
  dispose?: () => void | Promise<void>
}

export type DriverFactory<OptsT = any> = (opts?: OptsT) => Driver

export interface Storage {
  hasItem: (key: string) => Promise<boolean>
  getItem: (key: string) => Promise<StorageValue>
  setItem: (key: string, value: string) => Promise<void>
  removeItem: (key: string) => Promise<void>
  getKeys: () => Promise<string[]>
  clear: () => Promise<void>
  mount: (mountpoint: string, driver: Driver) => void
  dispose: () => Promise<void>
}
