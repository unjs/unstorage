import destr from 'destr'
import type { Storage, Driver } from './types'
import memory from './drivers/memory'
import { normalizeKey, normalizeBase, asyncCall, stringify } from './utils'

interface StorageCTX {
  mounts: Record<string, Driver>
  mountpoints: string[]
}

export function createStorage (): Storage {
  const ctx: StorageCTX = {
    mounts: { '': memory() },
    mountpoints: ['']
  }

  const getMount = (key?: string) => {
    key = normalizeKey(key)
    for (const base of ctx.mountpoints) {
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
    return ctx.mountpoints
      .filter(mountpoint => base!.startsWith(mountpoint))
      .map(mountpoint => ({
        mountpoint,
        driver: ctx.mounts[mountpoint]
      }))
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
      const keyGroups = await Promise.all(getMounts(base).map(async (mount) => {
        const rawKeys = await asyncCall(mount.driver.getKeys)
        return rawKeys.map(key => mount.mountpoint + normalizeKey(key))
      }))
      const keys = keyGroups.flat()
      return base ? keys.filter(key => key.startsWith(base!)) : keys
    },
    async clear (base) {
      await Promise.all(getMounts(base).map(m => asyncCall(m.driver.clear)))
    },
    async dispose () {
      await Promise.all(Object.values(ctx.mounts).map(driver => dispose(driver)))
    },
    async mount (base, driver, initialState) {
      base = normalizeBase(base)
      if (!ctx.mountpoints.includes(base)) {
        ctx.mountpoints.push(base)
        ctx.mountpoints.sort((a, b) => b.length - a.length)
      }
      if (ctx.mounts[base]) {
        if (ctx.mounts[base].dispose) {
          // eslint-disable-next-line no-console
          await dispose(ctx.mounts[base]!)
        }
        delete ctx.mounts[base]
      }
      ctx.mounts[base] = driver
      if (initialState) {
        await storage.setItems(base, initialState)
      }
    },
    async unmount (base: string, _dispose = true) {
      base = normalizeBase(base)
      if (!base /* root */ || !ctx.mounts[base]) {
        return
      }
      if (_dispose) {
        await dispose(ctx.mounts[base])
      }
      ctx.mountpoints = ctx.mountpoints.filter(key => key !== base)
      delete ctx.mounts[base]
    }
  }

  return storage
}

export async function snapshot (storage: Storage, base: string) {
  base = normalizeBase(base)
  const keys = await storage.getKeys(base)
  const snapshot: any = {}
  await Promise.all(keys.map(async (key) => {
    snapshot[key.substr(base.length)] = await storage.getItem(key)
  }))
  return snapshot
}

async function dispose (storage: Driver) {
  if (typeof storage.dispose === 'function') {
    await asyncCall(storage.dispose)
  }
}
