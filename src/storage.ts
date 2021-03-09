import destr from 'destr'
import type { Storage, Driver } from './types'
import memory from './drivers/memory'
import { normalizeKey, asyncCall, stringify } from './utils'

interface StorageCTX {
  mounts: Record<string, Driver>
  mountKeys: string[]
}

export function createStorage (): Storage {
  const ctx: StorageCTX = {
    mounts: { '': memory() },
    mountKeys: ['']
  }

  const getMount = (key: string = '') => {
    key = normalizeKey(key)
    for (const base of ctx.mountKeys) {
      if (key.startsWith(base)) {
        return {
          driver: ctx.mounts[base],
          key: key.substr(base.length)
        }
      }
    }
    return { driver: ctx.mounts[''], key }
  }

  const getMounts = (base: string = '') => {
    base = normalizeKey(base)
    return ctx.mountKeys
      .filter(key => base.startsWith(key))
      .map(key => getMount(key))
  }

  const storage: Storage = {
    hasItem (_key) {
      const { key, driver } = getMount(_key)
      return asyncCall(driver.hasItem, key)
    },
    getItem (_key) {
      const { key, driver } = getMount(_key)
      return asyncCall(driver.getItem, key).then(val => destr(val))
    },
    setItem (_key, value) {
      if (value === undefined) {
        return storage.removeItem(_key)
      }
      const { key, driver } = getMount(_key)
      return asyncCall(driver.setItem, key, stringify(value))
    },
    async setItems (base, items) {
      base = base ? (normalizeKey(base) + ':') : ''
      await Promise.all(Object.entries(items).map(e => storage.setItem(base + e[0], e[1])))
    },
    removeItem (_key) {
      const { key, driver } = getMount(_key)
      return asyncCall(driver.removeItem, key)
    },
    async getKeys (base = '') {
      const driverKeys = await Promise.all(getMounts(base).map(m => asyncCall(m.driver.getKeys)))
      return driverKeys.flat().map(normalizeKey).filter(key => key.startsWith(base))
    },
    async clear (base) {
      await Promise.all(getMounts(base).map(m => asyncCall(m.driver.clear)))
    },
    async dispose () {
      await Promise.all(Object.values(ctx.mounts).map(driver => disposeStoage(driver)))
    },
    async mount (base, driver, initialState) {
      base = normalizeKey(base)
      if (!ctx.mountKeys.includes(base)) {
        ctx.mountKeys.push(base)
        ctx.mountKeys.sort((a, b) => b.length - a.length)
      }
      if (ctx.mounts[base]) {
        if (ctx.mounts[base].dispose) {
          // eslint-disable-next-line no-console
          disposeStoage(ctx.mounts[base]!).catch(console.error)
        }
        delete ctx.mounts[base]
      }
      ctx.mounts[base] = driver
      if (initialState) {
        await storage.setItems(base, initialState)
      }
    }
  }

  return storage
}

async function disposeStoage (storage: Driver) {
  if (typeof storage.dispose === 'function') {
    await asyncCall(storage.dispose)
  }
}
