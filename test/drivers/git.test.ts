import { resolve } from 'path'
import { readFile, writeFile } from '../../src/drivers/utils/node-fs'
import { testDriver } from './utils'
import driver from '../../src/drivers/git'

describe('drivers: git', () => {

  testDriver({
    driver: driver({ 
      url: 'https://github.com/unjs/unstorage/',
      ref: 'main'
     }),
    additionalTests(ctx) {
    }
  })
})
