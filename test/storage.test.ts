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
    storage.watch(onChange)
    await storage.setItems('', data)
    expect(onChange).toHaveBeenCalledWith('update', 'data:foo')
  })
})
