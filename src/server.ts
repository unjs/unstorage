import { RequestListener } from 'http'
import { createApp, createError, useBody } from 'h3'
import { Storage } from './types'
import { stringify } from './_utils'

export interface StorageServerOptions {}

export interface StorageServer {
  handle: RequestListener
}

export function createStorageServer (storage: Storage, _opts: StorageServerOptions = {}): StorageServer {
  const app = createApp()
  app.use(async (req, res) => {
    // GET => getItem
    if (req.method === 'GET') {
      const val = await storage.getItem(req.url!)
      if (!val) {
        const keys = await storage.getKeys(req.url)
        return keys.map(key => key.replace(/:/g, '/'))
      }
      return stringify(val)
    }
    // HEAD => hasItem + meta (mtime)
    if (req.method === 'HEAD') {
      const _hasItem = await storage.hasItem(req.url!)
      res.statusCode = _hasItem ? 200 : 404
      if (_hasItem) {
        const meta = await storage.getMeta(req.url!)
        if (meta.mtime) {
          res.setHeader('Last-Modified', new Date(meta.mtime).toUTCString())
        }
      }
      return ''
    }
    // PUT => setItem
    if (req.method === 'PUT') {
      const val = await useBody(req)
      await storage.setItem(req.url!, val)
      return 'OK'
    }
    // DELETE => removeItem
    if (req.method === 'DELETE') {
      await storage.removeItem(req.url!)
      return 'OK'
    }
    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowd'
    })
  })

  return {
    handle: app
  }
}
