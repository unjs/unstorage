import { createApp } from 'vue'
import { createStorage } from '../src'
import httpDriver from '../src/drivers/http'
import App from './App.vue'

function main () {
  const storage = createStorage()
    .mount('/', httpDriver({ base: location.origin + '/storage' }))
  const app = createApp(App)
  app.provide('storage', storage)
  app.mount('#app')
}

main()
