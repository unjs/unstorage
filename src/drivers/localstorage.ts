import type { DriverFactory } from '../types'

export interface LocalStorageOptions {
  localStorage?: typeof window.localStorage
}

export default <DriverFactory> function (opts?: LocalStorageOptions) {
  const _localStorage = opts?.localStorage || (globalThis.localStorage as typeof window.localStorage)
  if (!_localStorage) {
    throw new Error('localStorage not available')
  }

  return {
    hasItem (key) {
      return Object.prototype.hasOwnProperty.call(_localStorage, key)
    },
    getItem (key) {
      return _localStorage.getItem(key)
    },
    setItem (key, value) {
      return _localStorage.setItem(key, value)
    },
    removeItem (key) {
      return _localStorage.removeItem(key)
    },
    getKeys () {
      return Object.keys(_localStorage)
    },
    clear () {
      _localStorage.clear()
    }
  }
}
