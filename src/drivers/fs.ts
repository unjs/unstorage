import { existsSync } from 'fs'
import { resolve, relative, join } from 'path'
import { FSWatcher, WatchOptions, watch } from 'chokidar'
import { defineDriver } from '../utils'
import { readFile, writeFile, readdirRecursive, rmRecursive, unlink } from './utils/node-fs'

export interface FSStorageOptions {
  base?: string
  ingore?: string[]
  watchOptions?: WatchOptions
}

export default defineDriver((opts: FSStorageOptions = {}) => {
  if (!opts.base) {
    throw new Error('dir is required')
  }

  if (!opts.ingore) {
    opts.ingore = [
      'node_modules'
    ]
  }

  opts.base = resolve(opts.base)
  const r = (key: string) => join(opts.base!, key.replace(/:/g, '/'))

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
        _watcher = watch(opts.base!, {
          ignoreInitial: true,
          ignored: opts.ingore,
          ...opts.watchOptions
        })
          .on('ready', resolve)
          .on('error', reject)
          .on('all', (eventName, path) => {
            path = relative(opts.base!, path)
            if (eventName === 'change' || eventName === 'add') {
              callback('update', path)
            } else if (eventName === 'unlink') {
              callback('remove', path)
            }
        })
      })
    }
  }
})
