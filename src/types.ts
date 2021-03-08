export type StorageValue = null | string | String | number | Number | boolean | Boolean | object

export interface Driver {
  hasItem: (key: string) => boolean | Promise<boolean>
  getItem: (key: string) => string | Promise<string>
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
  setItem: (key: string, value: StorageValue) => Promise<void>
  setItems: (base: string, items: Record<string, StorageValue>) => Promise<void>
  removeItem: (key: string) => Promise<void>
  getKeys: () => Promise<string[]>
  clear: () => Promise<void>
  mount: (base: string, driver: Driver, initialState?: Record<string, string>) => Promise<void>
  dispose: () => Promise<void>
}
