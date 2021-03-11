import type { DriverFactory } from '../types'

export interface LocalStorageOptions {
  window?: typeof window
  localStorage?: typeof window.localStorage
}

export default <DriverFactory>function (opts: LocalStorageOptions = {}) {
  if (!opts.window) {
    opts.window = typeof window !== 'undefined' ? window : undefined
  }
  if (!opts.localStorage) {
    opts.localStorage = opts.window?.localStorage
  }
  if (!opts.localStorage) {
    throw new Error('localStorage not available')
  }

  let _storageListener: (ev: StorageEvent) => void

  return {
    hasItem (key) {
      return Object.prototype.hasOwnProperty.call(opts.localStorage!, key)
    },
    getItem (key) {
      return opts.localStorage!.getItem(key)
    },
    setItem (key, value) {
      return opts.localStorage!.setItem(key, value)
    },
    removeItem (key) {
      return opts.localStorage!.removeItem(key)
    },
    getKeys () {
      return Object.keys(opts.localStorage!)
    },
    clear () {
      opts.localStorage!.clear()
      if (opts.window && _storageListener) {
        opts.window.removeEventListener('storage', _storageListener)
      }
    },
    watch(callback) {
      if (opts.window) {
        _storageListener = (ev: StorageEvent) => {
          if (ev.key) {
            callback(ev.newValue ? 'update' : 'remove', ev.key)
          }
        }
        opts.window.addEventListener('storage', _storageListener)
      }
    }
  }
}
