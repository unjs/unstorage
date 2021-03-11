import { listen } from 'listhen'
import { createStorage } from '../src'
import { createStorageServer } from '../src/server'

describe('server', () => {
  it('basic', async () => {
    const storage = createStorage()
    const storageServer = createStorageServer(storage)
    const { $fetch, close } = await listen(storageServer.handle)

    expect(await $fetch('foo', {})).toMatchObject([])

    await storage.setItem('foo/bar', 'bar')
    expect(await $fetch('foo/bar')).toBe('bar')

    expect(await $fetch('foo/bar', { method: 'PUT', body: 'updated' })).toBe('OK')
    expect(await $fetch('foo/bar')).toBe('updated')
    expect(await $fetch('/')).toMatchObject(['foo/bar'])

    expect(await $fetch('foo/bar', { method: 'DELETE' })).toBe('OK')
    expect(await $fetch('foo/bar', {})).toMatchObject([])

    await close()
  })
})
