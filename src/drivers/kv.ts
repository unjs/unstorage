import { defineDriver } from './utils'
import type { CloudflareWorkerKV } from 'types-cloudflare-worker'

export interface KVOptions {
  binding: string
}

// https://developers.cloudflare.com/workers/runtime-apis/kv

export default defineDriver((opts: KVOptions = { binding: '__STATIC_CONTENT' }) => {
  const binding = getGlobalBinding(opts.binding)

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
    dispose() { },
  }
})

function getGlobalBinding(name: string): CloudflareWorkerKV {
  const binding = (globalThis as any)[name]
  if (!binding) {
    throw new Error(`Cannot access Cloudflare KV binding ${name} from globalThis. Are you using driver in Cloudflare workers? Learn more how to assign bindings: https://developers.cloudflare.com/workers/runtime-apis/kv#kv-bindings`)
  }
  return binding
}
