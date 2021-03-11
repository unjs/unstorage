import { createStorage, snapshot } from '../src'
import memory from '../src/drivers/memory'

const data = {
  'etc:conf': 'test',
  'data:foo': 123
}

describe('storage', () => {
  it('mount/unmount', async () => {
    const storage = createStorage()
    await storage.mount('/mnt', memory(), data)
    expect(await snapshot(storage, '/mnt')).toMatchObject(data)
  })

  it('snapshot', async () => {
    const storage = createStorage()
    await storage.setItems('', data)
    expect(await snapshot(storage, '')).toMatchObject(data)
  })

  it('watch', async () => {
    const onChange = jest.fn()
    const storage = createStorage()
    await storage.mount('/mnt', memory(), data)
    await storage.watch(onChange)
    await storage.setItems('/mnt', data)
    expect(onChange).toHaveBeenCalledWith('update', 'mnt:data:foo')
  })
})
