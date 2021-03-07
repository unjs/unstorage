import { existsSync } from 'fs'
import { resolve } from 'path'
import type { StorageProviderFactory } from '../types'
import { readFile, writeFile, readdirRecursive, rmRecursive, unlink } from '../utils/node-fs'

export interface FSStorageOptions {
  dir: string
}

export const fsStorage: StorageProviderFactory = (opts: FSStorageOptions) => {
  if (!opts.dir) {
    throw new Error('dir is required')
  }

  const r = (key: string) => resolve(opts.dir, key.replace(/:/g, '/'))

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
    dispose () {}
  }
}
