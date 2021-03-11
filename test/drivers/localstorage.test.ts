import driver from '../../src/drivers/localstorage'
import { testDriver } from './utils'
import { JSDOM } from 'jsdom'

describe('drivers: localstorage', () => {
  const jsdom = new JSDOM('', {
    url: 'http://localhost'
  })
  jsdom.virtualConsole.sendTo(console)

  testDriver({
    driver: driver({ window: jsdom.window as unknown as typeof window }),
    additionalTests: (ctx => {
      it('check localstorage', () => {
        expect(jsdom.window.localStorage.getItem('s1:a')).toBe('test_data')
      })
      it('watch localstorage', async () => {
        const watcher = jest.fn()
        await ctx.storage.watch(watcher)

        // Emulate
        // jsdom.window.localStorage.setItem('s1:random_file', 'random')
        const ev = jsdom.window.document.createEvent('CustomEvent')
        ev.initEvent('storage', true)
        // @ts-ignore
        ev.key = 's1:random_file'
        // @ts-ignore
        ev.newValue = 'random'
        jsdom.window.dispatchEvent(ev)

        expect(watcher).toHaveBeenCalledWith('update', 's1:random_file')
      })
    })
  })
})
