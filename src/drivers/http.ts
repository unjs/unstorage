import { defineDriver } from './utils'
import { stringify } from './utils'
import { $fetch } from 'ofetch'
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
      const value = await $fetch(r(key))
      return value
    },
    async getMeta (key) {
      const res = await $fetch.raw(r(key), { method: 'HEAD' })
      let mtime = undefined
      const _lastModified = res.headers.get('last-modified')
      if (_lastModified) { mtime = new Date(_lastModified) }
      return {
        status: res.status,
        mtime
      }
    },
    async setItem(key, value) {
      await $fetch(r(key), { method: 'PUT', body: stringify(value) })
    },
    async removeItem (key) {
      await $fetch(r(key), { method: 'DELETE' })
    },
    async getKeys() {
      const value = await $fetch(r(''))
      return Array.isArray(value) ? value : []
    },
    clear() {
      // Not supported
    }
  }
})
