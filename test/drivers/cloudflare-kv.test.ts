import { describe } from 'vitest'
import { createStorage } from '../../src'
import CloudflareKV from '../../src/drivers/cloudflare-kv'
import { testDriver } from './utils'
import type { CloudflareWorkerKV } from 'types-cloudflare-worker'

const mockStorage = createStorage()
const mockBinding: CloudflareWorkerKV = {
  get(key) { return mockStorage.getItem(key) as any },
  put(key, value) { return mockStorage.setItem(key, value) as any },
  delete(key) { return mockStorage.removeItem(key) as any },
  list(key) { return mockStorage.getKeys(key).then(keys => ({ keys: keys.map(name => ({ name })) })) as any },
}

describe('drivers: cloudflare-kv', () => {
  testDriver({
    driver: CloudflareKV({ binding: mockBinding })
  })
})
