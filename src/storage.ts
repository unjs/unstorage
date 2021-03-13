import destr from 'destr'
import type { Storage, Driver, WatchCallback, StorageValue } from './types'
import memory from './drivers/memory'
import { normalizeKey, normalizeBase, asyncCall, stringify } from './utils'

interface StorageCTX {
  mounts: Record<string, Driver>
  mountpoints: string[]
  watching: boolean
  watchListeners: Function[]
}

export function createStorage (): Storage {
  const ctx: StorageCTX = {
    mounts: { '': memory() },
    mountpoints: [''],
    watching: false,
    watchListeners: []
  }

  const getMount = (key: string) => {
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

  const getMounts = (base: string) => {
    return ctx.mountpoints
      .filter(mountpoint => base!.length < mountpoint.length || base!.startsWith(mountpoint))
      .map(mountpoint => ({
        mountpoint,
        driver: ctx.mounts[mountpoint]
      }))
  }

  const onChange: WatchCallback = (event, key) => {
    if (!ctx.watching) { return }
    key = normalizeKey(key)
    for (const listener of ctx.watchListeners) {
      listener(event, key)
    }
  }

  const startWatch = async () => {
    if (ctx.watching) { return }
    ctx.watching = true
    for (const mountpoint in ctx.mounts) {
      await watch(ctx.mounts[mountpoint], onChange, mountpoint)
    }
  }

  const storage: Storage = {
    hasItem (key) {
      key = normalizeKey(key)
      const { relativeKey, driver } = getMount(key)
      return asyncCall(driver.hasItem, relativeKey)
    },
    getItem (key) {
      key = normalizeKey(key)
      const { relativeKey, driver } = getMount(key)
      return asyncCall(driver.getItem, relativeKey).then(val => destr(val))
    },
    async setItem (key, value) {
      if (value === undefined) {
        return storage.removeItem(key)
      }
      key = normalizeKey(key)
      const { relativeKey, driver } = getMount(key)
      await asyncCall(driver.setItem, relativeKey, stringify(value))
      if (!driver.watch) {
        onChange('update', key)
      }
    },
    async removeItem (key) {
      key = normalizeKey(key)
      const { relativeKey, driver } = getMount(key)
      await asyncCall(driver.removeItem, relativeKey)
      if (!driver.watch) {
        onChange('remove', key)
      }
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
      base = normalizeBase(base)
      await Promise.all(getMounts(base).map(m => asyncCall(m.driver.clear)))
    },
    async dispose () {
      await Promise.all(Object.values(ctx.mounts).map(driver => dispose(driver)))
    },
    mount (base, driver) {
      base = normalizeBase(base)
      if (base && ctx.mounts[base]) {
        throw new Error(`already mounted at ${base}`)
      }
      if (base) {
        ctx.mountpoints.push(base)
        ctx.mountpoints.sort((a, b) => b.length - a.length)
      }
      ctx.mounts[base] = driver
      if (ctx.watching) {
        Promise.resolve(watch(driver, onChange, base)).catch(console.error)
      }
      return storage
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
    },
    async watch (callback) {
      await startWatch()
      ctx.watchListeners.push(callback)
    }
  }

  return storage
}

export type Snapshot<T=string> = Record<string, T>

export async function snapshot (storage: Storage, base: string): Promise<Snapshot<string>> {
  base = normalizeBase(base)
  const keys = await storage.getKeys(base)
  const snapshot: any = {}
  await Promise.all(keys.map(async (key) => {
    snapshot[key.substr(base.length)] = await storage.getItem(key)
  }))
  return snapshot
}

export async function restoreSnapshot (storage: Storage, snapshot: Snapshot<StorageValue>, base: string = '') {
  base = normalizeBase(base)
  await Promise.all(Object.entries(snapshot).map(e => storage.setItem(base + e[0], e[1])))
}

function watch (storage: Driver, onChange: WatchCallback, base: string) {
  if (storage.watch) {
    return storage.watch((event, key) => onChange(event, base + key))
  }
}

async function dispose (storage: Driver) {
  if (typeof storage.dispose === 'function') {
    await asyncCall(storage.dispose)
  }
}
