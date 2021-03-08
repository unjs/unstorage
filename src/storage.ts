import destr from 'destr'
import type { Storage, Driver } from './types'
import memory from './drivers/memory'
import { normalizeKey, asyncCall, stringify } from './utils'

export function createStorage (): Storage {
  const defaultStorage = memory()

  // TODO: refactor to SortedMap / SortedMap
  const mounts: Record<string, Driver> = {}
  const mountKeys: string[] = [] // sorted keys of mounts

  const getAllDrivers = () => [defaultStorage, ...Object.values(mounts)]

  const getDriver = (key: string) => {
    key = normalizeKey(key)
    for (const base of mountKeys) {
      if (key.startsWith(base)) {
        return {
          driver: mounts[base],
          key: key.substr(base.length)
        }
      }
    }
    return {
      driver: defaultStorage,
      key
    }
  }

  const storage: Storage = {
    hasItem (_key) {
      const { key, driver } = getDriver(_key)
      return asyncCall(driver.hasItem, key)
    },
    getItem (_key) {
      const { key, driver } = getDriver(_key)
      return asyncCall(driver.getItem, key).then(val => destr(val))
    },
    setItem (_key, value) {
      if (value === undefined) {
        return storage.removeItem(_key)
      }
      const { key, driver } = getDriver(_key)
      return asyncCall(driver.setItem, key, stringify(value))
    },
    removeItem (_key) {
      const { key, driver } = getDriver(_key)
      return asyncCall(driver.removeItem, key)
    },
    async getKeys () {
      const driverKeys = await Promise.all(getAllDrivers().map(s => asyncCall(s.getKeys)))
      return driverKeys.flat().map(normalizeKey)
    },
    async clear () {
      await Promise.all(getAllDrivers().map(s => asyncCall(s.clear)))
    },
    async dispose () {
      await Promise.all(getAllDrivers().map(s => disposeStoage(s)))
    },
    mount (base, driver) {
      base = normalizeKey(base)
      if (!mountKeys.includes(base)) {
        mountKeys.push(base)
        mountKeys.sort((a, b) => b.length - a.length)
      }
      if (mounts[base]) {
        if (mounts[base].dispose) {
          // eslint-disable-next-line no-console
          disposeStoage(mounts[base]!).catch(console.error)
        }
        delete mounts[base]
      }
      mounts[base] = driver
    }
  }
  return storage
}

async function disposeStoage (storage: Driver) {
  if (typeof storage.dispose === 'function') {
    await asyncCall(storage.dispose)
  }
}
