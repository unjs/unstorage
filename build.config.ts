import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  declaration: true,
  entries: [
    'src/index',
    'src/server',
    { input: 'src/drivers/', outDir: 'drivers', format: 'esm' },
    { input: 'src/drivers/', outDir: 'drivers', format: 'cjs', declaration: false }
  ]
})
