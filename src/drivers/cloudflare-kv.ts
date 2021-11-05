import { defineDriver } from './utils'
import type { CloudflareWorkerKV } from 'types-cloudflare-worker'

export interface KVOptions {
  binding?: string | CloudflareWorkerKV
}

// https://developers.cloudflare.com/workers/runtime-apis/kv

export default defineDriver((opts: KVOptions = {}) => {
  const binding = getBinding(opts.binding)

  return {
    async hasItem(key) {
      return (await binding.get(key)) !== null
    },
    getItem(key) {
      return binding.get(key)
    },
    setItem(key, value) {
      return binding.put(key, value)
    },
    removeItem(key) {
      return binding.delete(key)
    },
    async getKeys(base) {
      const kvList = await binding.list(base)
      return kvList.keys.map(key => key.name)
    },
    async clear() {
      const keys = await this.getKeys()
      await Promise.all(keys.map(key => binding.delete(key)))
    }
  }
})


function getBinding(binding: CloudflareWorkerKV | string = 'STORAGE'): CloudflareWorkerKV {
  let bindingName = '[binding]'

  if (typeof binding === 'string') {
    bindingName = binding
    binding = (globalThis as any)[bindingName] as CloudflareWorkerKV
  }

  if (!binding) {
    throw new Error(`Invalid Cloudflare KV binding '${bindingName}': ${binding}`)
  }

  for (const key of ['get', 'put', 'delete']) {
    if (!(key in binding)) {
      throw new Error(`Invalid Cloudflare KV binding '${bindingName}': '${key}' key is missing`)
    }
  }

  return binding
}
