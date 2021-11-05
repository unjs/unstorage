import { defineDriver } from './utils'
import type { CloudflareWorkerKV } from 'types-cloudflare-worker'

export interface KVOptions {
  binding?: string
}

export default defineDriver((opts: KVOptions = {}) => {
  const binding = (globalThis as any)[opts.binding!] as CloudflareWorkerKV

  const getKeys = async () => {
    const kvList = await binding.list()
    return kvList.keys.map(key => key.name)
  }
  return {
    async hasItem(key) {
      return (await binding.get(key)) !== null
    },
    getItem(key) {
      return binding.get(key, 'json')
    },
    setItem(key, value) {
      binding.put(key, value)
    },
    removeItem(key) {
      binding.delete(key)
    },
    getKeys,
    async clear() {
      const keys = await getKeys()
      await Promise.all(keys.map(key => binding.delete(key)))
    },
    dispose() {},
  }
})
