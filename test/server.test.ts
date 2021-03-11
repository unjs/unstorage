import { listen } from 'listhen'
import { createStorage } from '../src'
import { createStorageServer } from '../src/server'

describe('server', () => {
  it('basic', async () => {
    const storage = createStorage()
    const storageServer = createStorageServer(storage)
    const { $fetch, close } = await listen(storageServer.handle)

    await expect(() => $fetch('foo', {})).rejects.toMatchObject({ name: 'FetchError', data: null })

    await storage.setItem('foo', 'bar')
    expect(await $fetch('foo')).toBe('bar')

    expect(await $fetch('foo', { method: 'PUT', body: 'updated' })).toBe('OK')
    expect(await $fetch('foo')).toBe('updated')

    expect(await $fetch('foo', { method: 'DELETE' })).toBe('OK')
    await expect(() => $fetch('foo', {})).rejects.toMatchObject({ name: 'FetchError', data: null })

    await close()
  })
})
