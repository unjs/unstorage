import { resolve } from 'path'
import { JSDOM } from 'jsdom'
import { readFile, rmRecursive } from '../src/utils/node-fs'
import {
  Storage, StorageProvider, createStorage,
  memoryStorage, fsStorage, localStorage
} from '../src'

describe('memoryStorage', () => {
  testProvider(() => {
    return {
      provider: memoryStorage()
    }
  })
})

describe('fsStorage', () => {
  testProvider(async () => {
    const dir = resolve(__dirname, 'tmp')
    await rmRecursive(dir)
    return {
      provider: fsStorage({ dir }),
      async verify () {
        expect(await readFile(resolve(dir, 'foo/bar'))).toBe('test_data')
      }
    }
  })
})

describe('localStorage', () => {
  testProvider(() => {
    const jsdom = new JSDOM('', { url: 'http://localhost' })
    return {
      provider: localStorage({ localStorage: jsdom.window.localStorage })
    }
  })
})

interface TestParams {
  provider: StorageProvider
  verify?: (TestParams?) => void | Promise<void>
}

function testProvider (getParams: () => TestParams | Promise<TestParams>) {
  let storage: Storage
  let params: TestParams

  it('init', async () => {
    storage = createStorage()
    params = await getParams()
    storage.mount('/', params.provider)
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

  it('verify', () => {
    if (params.verify) {
      return params.verify(params)
    }
  })

  it('removeItem', async () => {
    await storage.removeItem('foo:bar')
    expect(await storage.hasItem('foo:bar')).toBe(false)
    expect(await storage.getItem('foo:bar')).toBe(null)
    expect(await storage.getKeys()).toMatchObject([])
  })
}
