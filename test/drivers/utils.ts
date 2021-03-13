import { Storage, Driver, createStorage, restoreSnapshot } from '../../src'

export interface TestContext {
  storage: Storage
  driver: Driver
}

export interface TestOptions {
  driver: Driver
  additionalTests?: (ctx: TestContext) => void
}

export function testDriver (opts: TestOptions) {
  const ctx: TestContext = {
    storage: createStorage(),
    driver: opts.driver
  }

  it('init', async () => {
    await ctx.storage.mount('/', ctx.driver)
    await restoreSnapshot(ctx.storage, { initial: 'works' })
    expect(await ctx.storage.getItem('initial')).toBe('works')
    await ctx.storage.clear()
  })

  it('initial state', async () => {
    expect(await ctx.storage.hasItem('s1:a')).toBe(false)
    expect(await ctx.storage.getItem('s2:a')).toBe(null)
    expect(await ctx.storage.getKeys()).toMatchObject([])
  })

  it('setItem', async () => {
    await ctx.storage.setItem('s1:a', 'test_data')
    await ctx.storage.setItem('s2:a', 'test_data')
    expect(await ctx.storage.hasItem('s1:a')).toBe(true)
    expect(await ctx.storage.getItem('s1:a')).toBe('test_data')
  })

  it('getKeys', async () => {
    expect(await ctx.storage.getKeys().then(k => k.sort())).toMatchObject(['s1:a', 's2:a'].sort())
    expect(await ctx.storage.getKeys('s1').then(k => k.sort())).toMatchObject(['s1:a'].sort())
  })

  it('serialize (object)', async () => {
    await ctx.storage.setItem('/data/test.json', { json: 'works' })
    expect(await ctx.storage.getItem('/data/test.json')).toMatchObject({ json: 'works' })
  })

  it('serialize (primitive)', async () => {
    await ctx.storage.setItem('/data/true.json', true)
    expect(await ctx.storage.getItem('/data/true.json')).toBe(true)
  })

  if (opts.additionalTests) {
    opts.additionalTests(ctx)
  }

  it('removeItem', async () => {
    await ctx.storage.removeItem('s1:a')
    expect(await ctx.storage.hasItem('s1:a')).toBe(false)
    expect(await ctx.storage.getItem('s1:a')).toBe(null)
  })

  it('clear', async () => {
    await ctx.storage.clear()
    expect(await ctx.storage.getKeys()).toMatchObject([])
  })

  it('dispose', async () => {
    await ctx.storage.dispose()
  })
}
