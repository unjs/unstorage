import { describe } from 'vitest'
import driver from '../../src/drivers/memory'
import { testDriver } from './utils'

describe('drivers: memory', () => {
  testDriver({
    driver: driver()
  })
})
