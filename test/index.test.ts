import { resolve } from 'path'
import { JSDOM } from 'jsdom'
import { readFile, rmRecursive } from '../src/drivers/utils/node-fs' // TODO
import { Storage, Driver, createStorage } from '../src'
import memoryDriver from '../src/drivers/memory'
import fsDriver from '../src/drivers/fs'
import localstorageDriver from '../src/drivers/localstorage'

describe('memoryStorage', () => {
  testDriver(() => {
    return {
      driver: memoryDriver()
    }
  })
})

describe('fsStorage', () => {
  testDriver(async () => {
    const dir = resolve(__dirname, 'tmp')
    await rmRecursive(dir)
    return {
      driver: fsDriver({ dir }),
      async verify () {
        expect(await readFile(resolve(dir, 'foo/bar'))).toBe('test_data')
      }
    }
  })
})

describe('localStorage', () => {
  testDriver(() => {
    const jsdom = new JSDOM('', { url: 'http://localhost' })
    return {
      driver: localstorageDriver({ localStorage: jsdom.window.localStorage })
    }
  })
})

interface TestParams {
  driver: Driver
  verify?: (params?: TestParams) => void | Promise<void>
}

function testDriver (getParams: () => TestParams | Promise<TestParams>) {
  let storage: Storage
  let params: TestParams

  it('init', async () => {
    storage = createStorage()
    params = await getParams()
    await storage.mount('/', params.driver, { initial: 'works' })
    expect(await storage.getItem('initial')).toBe('works')
    await storage.clear()
  })

  it('initial state', async () => {
    expect(await storage.hasItem('foo:bar')).toBe(false)
    expect(await storage.getItem('foo:bar')).toBe(null)
    expect(await storage.getKeys()).toMatchObject([])
  })

  it('setItem', async () => {
    await storage.setItem('/foo:bar/', 'test_data')
    expect(await storage.hasItem('foo:bar')).toBe(true)
    expect(await storage.getItem('foo:bar')).toBe('test_data')
    expect(await storage.getKeys()).toMatchObject(['foo:bar'])
  })

  it('serialize (object)', async () => {
    await storage.setItem('test.json', { json: 'works' })
    expect(await storage.getItem('test.json')).toMatchObject({ json: 'works' })
  })

  it('serialize (primitive)', async () => {
    await storage.setItem('true.json', true)
    expect(await storage.getItem('true.json')).toBe(true)
  })

  it('verify', () => {
    if (params.verify) {
      return params.verify(params)
    }
  })

  it('removeItem', async () => {
    await storage.removeItem('foo:bar')
    expect(await storage.hasItem('foo:bar')).toBe(false)
    expect(await storage.getItem('foo:bar')).toBe(null)
  })

  it('clear', async () => {
    await storage.clear()
    expect(await storage.getKeys()).toMatchObject([])
  })
}
