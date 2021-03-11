import { createStorage, snapshot } from '../src'

const data = {
  'etc:conf': 'test',
  'data:foo': 'bar'
}

describe('snapshot', () => {
  it('snapshot', async () => {
    const storage = createStorage()
    await storage.setItems('', data)
    expect(await snapshot(storage, '')).toMatchObject(data)
  })

  it('snapshot (subpath)', async () => {
    const storage = createStorage()
    await storage.setItems('', data)
    expect(await snapshot(storage, 'etc')).toMatchObject({ conf: 'test' })
  })
})
