import { existsSync } from 'fs'
import { resolve, relative, join } from 'path'
import { FSWatcher, WatchOptions, watch } from 'chokidar'
import type { DriverFactory } from '../types'
import { readFile, writeFile, readdirRecursive, rmRecursive, unlink } from './utils/node-fs'

export interface FSStorageOptions {
  dir: string
  ingore: string[]
  watchOptions: WatchOptions
}

export default <DriverFactory> function (opts: FSStorageOptions) {
  if (!opts.dir) {
    throw new Error('dir is required')
  }

  if (!opts.ingore) {
    opts.ingore = [
      'node_modules'
    ]
  }

  opts.dir = resolve(opts.dir)
  const r = (key: string) => join(opts.dir, key.replace(/:/g, '/'))

  let _watcher: FSWatcher

  return {
    hasItem (key) {
      return existsSync(r(key))
    },
    getItem (key) {
      return readFile(r(key))
    },
    setItem (key, value) {
      return writeFile(r(key), value)
    },
    removeItem (key) {
      return unlink(r(key))
    },
    getKeys () {
      return readdirRecursive(r('.'))
    },
    async clear () {
      await rmRecursive(r('.'))
    },
    async dispose() {
      if (_watcher) {
        await _watcher.close()
      }
     },
    watch(callback) {
      if (_watcher) {
        return
      }
      return new Promise((resolve, reject) => {
        _watcher = watch(opts.dir, {
          ignoreInitial: true,
          ignored: opts.ingore,
          ...opts.watchOptions
        })
          .on('ready', resolve)
          .on('error', reject)
          .on('all', (eventName, path) => {
            path = relative(opts.dir, path)
            if (eventName === 'change' || eventName === 'add') {
              callback('update', path)
            } else if (eventName === 'unlink') {
              callback('remove', path)
            }
        })
      })
    }
  }
}
