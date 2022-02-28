import fs, { existsSync, promises as fsp } from 'fs'
import git from 'isomorphic-git'
import http from 'isomorphic-git/http/node'
import { defineDriver } from '..'
import { join } from 'path'
import { readdirRecursive, rmRecursive, writeFile, readFile, unlink } from './utils/node-fs'

interface DriverOptions {
  url?: string
  ref?: string
  path?: string
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
    depth: 1
  }
  let initiated = false
  const clone = async () => git.clone(gitOpts)
  
  const resolve = (...path: string[]) => join(gitOpts.dir, ...path)
  
  const r = (key: string) => resolve(opts.path || '/', key.replace(/:/g, '/'))

  return {
    
    async hasItem (key) {
      if (!initiated) {
        await clone()
        initiated = true
      }
      return existsSync(r(key))
    },
    async getItem (key) {
      if (!initiated) {
        await clone()
        initiated = true
      }
      return readFile(r(key))
    },
    async setItem (key, value) {
      if (!initiated) {
        await clone()
        initiated = true
      }
      
      return writeFile(r(key), value)
    },
    async removeItem (key) { 
      if (!initiated) {
        await clone()
        initiated = true
      }
      return unlink(r(key))
    },
    async getMeta (key) {
      if (!initiated) {
        await clone()
        initiated = true
      }
      const { atime, mtime, size } = await fsp.stat(r(key))
        .catch(() => ({ atime: undefined, mtime: undefined, size: undefined }))
      return { atime, mtime, size: size as number }
    },
    async getKeys () {
      if (!initiated) {
        await clone()
        initiated = true
      }
      
      return readdirRecursive(r('.'), () => false)
    },
    async clear() {
      await rmRecursive(r('.'))
    }
  }
})
