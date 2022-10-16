import { RequestListener } from 'http'
import { createApp, createError, readBody, eventHandler, toNodeListener } from 'h3'
import { Storage } from './types'
import { stringify } from './_utils'

export interface StorageServerOptions {}

export interface StorageServer {
  handle: RequestListener
}

export function createStorageServer (storage: Storage, _opts: StorageServerOptions = {}): StorageServer {
  const app = createApp()
  app.use(eventHandler(async (event) => {
    // GET => getItem
    if (event.req.method === 'GET') {
      const val = await storage.getItem(event.req.url!)
      if (!val) {
        const keys = await storage.getKeys(event.req.url)
        return keys.map(key => key.replace(/:/g, '/'))
      }
      return stringify(val)
    }
    // HEAD => hasItem + meta (mtime)
    if (event.req.method === 'HEAD') {
      const _hasItem = await storage.hasItem(event.req.url!)
      event.res.statusCode = _hasItem ? 200 : 404
      if (_hasItem) {
        const meta = await storage.getMeta(event.req.url!)
        if (meta.mtime) {
          event.res.setHeader('Last-Modified', new Date(meta.mtime).toUTCString())
        }
      }
      return ''
    }
    // PUT => setItem
    if (event.req.method === 'PUT') {
      const val = await readBody(event)
      await storage.setItem(event.req.url!, val)
      return 'OK'
    }
    // DELETE => removeItem
    if (event.req.method === 'DELETE') {
      await storage.removeItem(event.req.url!)
      return 'OK'
    }
    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed'
    })
  }))

  return {
    handle: toNodeListener(app)
  }
}
