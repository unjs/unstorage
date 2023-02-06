import type { Driver } from '../types'
import memoryDriver from './memory'
import { defineDriver } from './utils'

export interface CacheDriverOptions {
  driver: Driver
}

export default defineDriver((opts: CacheDriverOptions) => {
  const driver = opts.driver || memoryDriver()
  const memory = memoryDriver()
  return {
    ...driver,
    async hasItem(key) {
      if (await memory.hasItem(key))
        return true

      return driver.hasItem(key)
    },
    async setItem(key, value: any) {
      driver.setItem?.(key, value),
      await memory.setItem(key, value)
    },
    async getItem(key) {
      let value = memory.getItem(key)

      if (value !== null)
        return value

      value = await driver.getItem(key)
      memory.setItem(key, value)

      return value
    },
  }
})
