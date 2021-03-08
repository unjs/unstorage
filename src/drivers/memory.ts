import type { DriverFactory, StorageValue } from '../types'

export default <DriverFactory> function () {
  const data = new Map<string, StorageValue>()

  return {
    hasItem (key) {
      return data.has(key)
    },
    getItem (key) {
      return data.get(key) || null
    },
    setItem (key, value) {
      data.set(key, value)
    },
    removeItem (key) {
      data.delete(key)
    },
    getKeys () {
      return Array.from(data.keys())
    },
    clear () {
      data.clear()
    },
    dispose () {
      data.clear()
    }
  }
}
