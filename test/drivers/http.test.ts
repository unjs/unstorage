import driver from '../../src/drivers/http'
import { createStorage } from '../../src'
import { createStorageServer } from '../../src/server'
import { listen } from 'listhen'

describe('drivers: http', () => {
  it('basic', async () => {
    const storage = createStorage()
    const server = createStorageServer(storage)

    const { url, close } = await listen(server.handle)
    await storage.mount('/http', driver({ base: url }))

    expect(await storage.hasItem('/http/foo')).toBe(false)

    await storage.setItem('/http/foo', 'bar')
    expect(await storage.getItem('http:foo')).toBe('bar')
    expect(await storage.hasItem('/http/foo')).toBe(true)

    await close()
  })
})
