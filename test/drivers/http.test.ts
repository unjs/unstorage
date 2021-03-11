import driver from '../../src/drivers/http'
import { createStorage } from '../../src'
import { listen } from 'listhen'

describe('drivers: http', () => {
  it('basic', async () => {
    const { url, close } = await listen((req, res) => {
      if (req.url.includes('404')) {
        res.writeHead(404)
      }
      res.end(req.url)
    })

    const storage = createStorage()
    await storage.mount('/http', driver({ base: url }))

    expect(await storage.getItem('http:foo')).toBe('/foo')
    expect(await storage.hasItem('/http/any')).toBe(true)
    expect(await storage.hasItem('/http/404')).toBe(false)

    await close()
  })
})
