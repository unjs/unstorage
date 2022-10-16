import fs, { existsSync, promises as fsp } from 'fs'
import _git from 'isomorphic-git'
import { fetch } from 'node-fetch-native'
import { defineDriver } from './utils'
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
    http: _createHTTP(),
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
      if (!initialTask) initialTask = _git.clone(gitOpts)
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

// --- Isomorphic HTTP driver  ---

function _createHTTP() {
  async function _collectBody(iterable) {
    let size = 0
    const buffers = []
    for await (const value of iterable) {
      buffers.push(value)
      size += value.byteLength
    }
    const result = new Uint8Array(size)
    let nextIndex = 0
    for (const buffer of buffers) {
      result.set(buffer, nextIndex)
      nextIndex += buffer.byteLength
    }
    return result
  }

  function _fromStream(stream) {
    if (stream[Symbol.asyncIterator]) return stream
    const reader = stream.getReader()
    return {
      next() { return reader.read() },
      return() { reader.releaseLock(); return {} },
      [Symbol.asyncIterator]() { return this },
    }
  }

  async function request({ url, method = 'GET', headers = {}, body }) {
    if (body) { body = await _collectBody(body) }
    const res = await fetch(url, { method, headers, body })
    const iter = res.body && res.body.getReader ? _fromStream(res.body) : [new Uint8Array(await res.arrayBuffer())]
    headers = {}
    for (const [key, value] of res.headers.entries()) {
      headers[key] = value
    }
    return {
      url: res.url,
      method: (res as any).method || method,
      statusCode: res.status,
      statusMessage: res.statusText,
      body: iter,
      headers: headers,
    }
  }
  return { request }
}
