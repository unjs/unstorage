import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  declaration: true,
  rollup: {
    emitCJS: true
  },
  entries: [
    'src/index',
    'src/server',
    { input: 'src/drivers/', outDir: 'dist/drivers', format: 'esm' },
    { input: 'src/drivers/', outDir: 'dist/drivers', format: 'cjs', ext: 'cjs', declaration: false }
  ]
})
