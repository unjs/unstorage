import destr from 'destr'
import type { Storage, Driver } from './types'
import memory from './drivers/memory'
import { normalizeKey, normalizeBase, asyncCall, stringify } from './utils'

interface StorageCTX {
  mounts: Record<string, Driver>
  mountKeys: string[]
}

export function createStorage (): Storage {
  const ctx: StorageCTX = {
    mounts: { '': memory() },
    mountKeys: ['']
  }

  const getMount = (key?: string) => {
    key = normalizeKey(key)
    for (const base of ctx.mountKeys) {
      if (key.startsWith(base)) {
        return {
          relativeKey: key.substr(base.length),
          driver: ctx.mounts[base]
        }
      }
    }
    return {
      relativeKey: key,
      driver: ctx.mounts['']
    }
  }

  const getMounts = (base?: string) => {
    base = normalizeBase(base)
    return ctx.mountKeys
      .filter(key => base!.startsWith(key))
      .map(key => getMount(key))
  }

  const storage: Storage = {
    hasItem (key) {
      const { relativeKey, driver } = getMount(key)
      return asyncCall(driver.hasItem, relativeKey)
    },
    getItem (key) {
      const { relativeKey, driver } = getMount(key)
      return asyncCall(driver.getItem, relativeKey).then(val => destr(val))
    },
    setItem (key, value) {
      if (value === undefined) {
        return storage.removeItem(key)
      }
      const { relativeKey, driver } = getMount(key)
      return asyncCall(driver.setItem, relativeKey, stringify(value))
    },
    async setItems (base, items) {
      base = normalizeBase(base)
      await Promise.all(Object.entries(items).map(e => storage.setItem(base + e[0], e[1])))
    },
    removeItem (key) {
      const { relativeKey, driver } = getMount(key)
      return asyncCall(driver.removeItem, relativeKey)
    },
    async getKeys (base) {
      base = normalizeBase(base)
      const rawKeys = await Promise.all(getMounts(base).map(m => asyncCall(m.driver.getKeys)))
      const keys = rawKeys.flat().map(key => normalizeKey(key))
      return base ? keys.filter(key => key.startsWith(base!)) : keys
    },
    async clear (base) {
      await Promise.all(getMounts(base).map(m => asyncCall(m.driver.clear)))
    },
    async dispose () {
      await Promise.all(Object.values(ctx.mounts).map(driver => dispose(driver)))
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
          dispose(ctx.mounts[base]!).catch(console.error)
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

async function dispose (storage: Driver) {
  if (typeof storage.dispose === 'function') {
    await asyncCall(storage.dispose)
  }
}
