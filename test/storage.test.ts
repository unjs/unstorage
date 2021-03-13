import { createStorage, snapshot } from '../src'
import memory from '../src/drivers/memory'

const data = {
  'etc:conf': 'test',
  'data:foo': 123
}

describe('storage', () => {
  it('mount/unmount', async () => {
    const storage = createStorage().mount('/mnt', memory())
    await storage.setItems('/mnt', data)
    expect(await snapshot(storage, '/mnt')).toMatchObject(data)
  })

  it('snapshot', async () => {
    const storage = createStorage()
    await storage.setItems('', data)
    expect(await snapshot(storage, '')).toMatchObject(data)
  })

  it('watch', async () => {
    const onChange = jest.fn()
    const storage = createStorage().mount('/mnt', memory())
    await storage.watch(onChange)
    await storage.setItems('/mnt', data)
    expect(onChange).toHaveBeenCalledWith('update', 'mnt:data:foo')
  })
})
