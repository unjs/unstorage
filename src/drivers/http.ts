import { defineDriver } from '../utils'
import { stringify } from '../utils'
import { $fetch } from 'ohmyfetch/node'
import { joinURL } from 'ufo'

export interface HTTPOptions {
  base?: string
}

export default defineDriver((opts: HTTPOptions = {}) => {
  const r = (key: string) => joinURL(opts.base!, key.replace(/:/g, '/'))

  return {
    hasItem(key) {
      return $fetch(r(key), { method: 'HEAD' })
        .then(() => true)
        .catch(() => false)
    },
    async getItem (key) {
      const value = $fetch(r(key))
      return value
    },
    async setItem(key, value) {
      await $fetch(r(key), { method: 'PUT', body: stringify(value) })
    },
    async removeItem (key) {
      await $fetch(r(key), { method: 'DELETE' })
    },
    getKeys() {
      const value = $fetch(r(''))
      return Array.isArray(value) ? value : []
    },
    clear() {
      // Not supported
    }
  }
})
