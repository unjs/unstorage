import { resolve } from 'path'
import mri from 'mri'
import { listen } from 'listhen'
import { createStorage } from './storage'
import { createStorageServer } from './server'
import fsDriver from './drivers/fs'

async function main () {
  const args = mri(process.argv.splice(2))

  if (args.help) {
    // eslint-disable-next-line no-console
    console.log('Usage: npx unstorage [rootDir]')
    process.exit(0)
  }

  const rootDir = resolve(args._[0] || '.')

  const storage = createStorage({
    driver: fsDriver({ base: rootDir })
  })

  const storageServer = createStorageServer(storage)

  await listen(storageServer.handle, {
    name: 'Storage server',
    port: 8080
  })
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
