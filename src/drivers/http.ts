import type { DriverFactory, StorageValue } from '../types'
import { $fetch } from 'ohmyfetch/node'
import { joinURL } from 'ufo'

export interface HTTPOptions {
  base: string
}

export default <DriverFactory>function (opts: HTTPOptions) {
  const r = (key: string) => joinURL(opts.base, key.replace(/:/g, '/'))

  return {
    hasItem(key) {
      return $fetch(r(key), { method: 'HEAD' })
        .then(() => true)
        .catch(() => false)
    },
    getItem (key) {
      return $fetch(r(key))
    },
    setItem(_key, _value) {
      // Not supported
    },
    removeItem (_key) {
      // Not supported
    },
    getKeys() {
      // Not supported
      return []
    },
    clear() {
      // Not supported
    }
  }
}
