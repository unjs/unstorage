export * from './storage'
export * from './types'
export * from './utils'
export { defineDriver } from './drivers/utils'

export const builtinDrivers = {
  cloudflareKVHTTP: 'unstorage/drivers/cloudflare-kv-http',
  cloudflareKVBinding: 'unstorage/drivers/cloudflare-kv',
  fs: 'unstorage/drivers/fs',
  github: 'unstorage/drivers/github',
  http: 'unstorage/drivers/http',
  localStorage: 'unstorage/drivers/localstorage',
  memory: 'unstorage/drivers/memory',
  overlay: 'unstorage/drivers/overlay',
  redis: 'unstorage/drivers/redis'
}
