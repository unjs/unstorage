import fs, { existsSync, promises as fsp } from 'fs'
import git from 'isomorphic-git'
import http from 'isomorphic-git/http/web'
import { defineDriver } from '..'
import { join } from 'path'
import { readdirRecursive, rmRecursive, writeFile, readFile, unlink } from './utils/node-fs'

interface DriverOptions {
  url?: string
  ref?: string
  path?: string
  auth?: {
    username: string
    password: string
  }
}

export default defineDriver((opts: DriverOptions = {}) => {
  const gitOpts = {
    fs,
    http,
    url: opts.url!,
    dir: '/tmp/' + opts.url!.replace(/[^a-z0-9]/gi, '-'),
    ref: opts.ref,
    singleBranch: true,
    noTags: true,
    depth: 1,
    onAuth: () => opts.auth || { cancel: true }
  }

  let isInitialized = false
  let initialTask: Promise<any>
  const ensureInitialized = async () => {
    if (!isInitialized) {
      if (!initialTask) initialTask = git.clone(gitOpts)
      await initialTask
      isInitialized = true
    }
  }
  
  const resolve = (...path: string[]) => join(gitOpts.dir, ...path)
  
  const r = (key: string) => resolve(opts.path || '/', key.replace(/:/g, '/'))

  return {
    
    async hasItem (key) {
      await ensureInitialized()

      return existsSync(r(key))
    },
    async getItem (key) {
      await ensureInitialized()

      return readFile(r(key))
    },
    async setItem (key, value) {
      await ensureInitialized()
      
      return writeFile(r(key), value)
    },
    async removeItem (key) { 
      await ensureInitialized()

      return unlink(r(key))
    },
    async getMeta (key) {
      await ensureInitialized()

      const { atime, mtime, size } = await fsp.stat(r(key))
        .catch(() => ({ atime: undefined, mtime: undefined, size: undefined }))
      return { atime, mtime, size: size as number }
    },
    async getKeys () {
      await ensureInitialized()
      
      return readdirRecursive(r('.'), () => false)
    },
    async clear() {
      await rmRecursive(r('.'))
    }
  }
})
