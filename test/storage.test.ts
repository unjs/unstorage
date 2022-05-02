import { describe, it, expect, vi } from 'vitest'
import { createStorage, snapshot, restoreSnapshot, prefixStorage } from '../src'
import memory from '../src/drivers/memory'

const data = {
  'etc:conf': 'test',
  'data:foo': 123
}

describe('storage', () => {
  it('mount/unmount', async () => {
    const storage = createStorage().mount('/mnt', memory())
    await restoreSnapshot(storage, data, 'mnt')
    expect(await snapshot(storage, '/mnt')).toMatchObject(data)
  })

  it('snapshot', async () => {
    const storage = createStorage()
    await restoreSnapshot(storage, data)
    expect(await snapshot(storage, '')).toMatchObject(data)
  })

  it('watch', async () => {
    const onChange = vi.fn()
    const storage = createStorage().mount('/mnt', memory())
    await storage.watch(onChange)
    await restoreSnapshot(storage, data, 'mnt')
    expect(onChange).toHaveBeenCalledWith('update', 'mnt:data:foo')
  })

  it('mount overides', async () => {
    const storage = createStorage()
    const subStorage = memory()

    await storage.setItem('/mnt/test.txt', 'v1')
    await storage.setItem('/mnt/test.base.txt', 'v1')

    storage.mount('/mnt', subStorage)
    await storage.setItem('/mnt/test.txt', 'v2')

    expect(await storage.getItem('/mnt/test.txt')).toBe('v2')

    expect(await storage.getKeys()).toMatchInlineSnapshot(`
      [
        "mnt:test.txt",
        "mnt:test.txt",
        "mnt:test.base.txt",
      ]
    `)
  })
})


describe('utils', () => {
  it('prefixStorage', async () => {
    const storage = createStorage()
    const pStorage = prefixStorage(storage, 'foo')
    await pStorage.setItem('x', 'bar')
    await pStorage.setItem('y', 'baz')
    expect(await storage.getItem('foo:x')).toBe('bar')
    expect(await pStorage.getItem('x')).toBe('bar')
    expect(await pStorage.getKeys()).toStrictEqual(['x', 'y'])

    // Higher order storage
    const secondStorage = createStorage()
    secondStorage.mount('/mnt', storage)
    const mntStorage = prefixStorage(secondStorage, 'mnt')

    expect(await mntStorage.getKeys()).toStrictEqual(['foo:x', 'foo:y'])
    // Get keys from sub-storage
    expect(await mntStorage.getKeys('foo')).toStrictEqual(['foo:x', 'foo:y'])
  })
})
