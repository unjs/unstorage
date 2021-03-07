import { resolve } from 'path'
import { JSDOM } from 'jsdom'
import { rmRecursive } from '../src/utils/node-fs'
import {
  Storage, StorageProvider, createStorage,
  memoryStorage, fsStorage, localStorage
} from '../src'

describe('memoryStorage', () => {
  testProvider(() => memoryStorage())
})

describe('fsStorage', () => {
  testProvider(async () => {
    const dir = resolve(__dirname, 'tmp')
    await rmRecursive(dir)
    return fsStorage({ dir })
  })
})

describe('localStorage', () => {
  testProvider(() => {
    const jsdom = new JSDOM('', {
      url: 'http://localhost'
    })
    return localStorage({
      localStorage: jsdom.window.localStorage
    })
  })
})

function testProvider (getProvider: () => StorageProvider | Promise<StorageProvider>) {
  let storage: Storage
  it('init', async () => {
    storage = createStorage()
    const provider = await getProvider()
    storage.mount('/', provider)
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

  it('removeItem', async () => {
    await storage.removeItem('foo:bar')
    expect(await storage.hasItem('foo:bar')).toBe(false)
    expect(await storage.getItem('foo:bar')).toBe(null)
    expect(await storage.getKeys()).toMatchObject([])
  })
}
