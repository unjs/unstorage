import { resolve } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createStorage } from '../src'
import { createStorageServer } from '../src/server'
import fsdriver from '../src/drivers/fs'

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      'node-fetch': 'node-fetch/browser'
    }
  },
  plugins: [
    vue(),
    {
      name: 'app',
      async configureServer (server) {
        const storage = createStorage()
        const storageServer = createStorageServer(storage)
        await storage.mount('/src', fsdriver({ base: resolve(__dirname, '..') }))
        server.middlewares.use('/storage', storageServer.handle)
      }
    }
  ]
})
