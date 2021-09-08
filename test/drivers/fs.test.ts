import { resolve } from 'path'
import { readFile, writeFile } from '../../src/drivers/utils/node-fs'
import { testDriver } from './utils'
import driver from '../../src/drivers/fs'

describe('drivers: fs', () => {
  const dir = resolve(__dirname, 'tmp')

  testDriver({
    driver: driver({ base: dir }),
    additionalTests(ctx) {
      it('check filesystem', async () => {
        expect(await readFile(resolve(dir, 's1/a'))).toBe('test_data')
      })
      it('native meta', async () => {
        const meta = await ctx.storage.getMeta('/s1/a')
        expect(meta.atime?.constructor.name).toBe('Date')
        expect(meta.mtime?.constructor.name).toBe('Date')
        expect(meta.size).toBeGreaterThan(0)
      })
      it('watch filesystem', async () => {
        const watcher = jest.fn()
        await ctx.storage.watch(watcher)
        await writeFile(resolve(dir, 's1/random_file'), 'random')
        await new Promise(resolve => setTimeout(resolve, 500))
        expect(watcher).toHaveBeenCalledWith('update', 's1:random_file')
      })
    }
  })
})
