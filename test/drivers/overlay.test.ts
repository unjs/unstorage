import { describe } from 'vitest'
import driver from '../../src/drivers/overlay'
import memory from '../../src/drivers/memory'
import { testDriver } from './utils'

describe('drivers: overlay', () => {
  const [s1, s2] = [memory(), memory()]
  testDriver({
    driver: driver({
      layers: [s1, s2]
    })
  })
})
