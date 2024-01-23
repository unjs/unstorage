export default defineNuxtConfig({
  routeRules: {
    '/usage': { redirect: '/getting-started/usage' },
    '/utils': { redirect: '/getting-started/utils' },
    '/http-server': { redirect: '/getting-started/http-server' },
    '/custom-driver': { redirect: '/getting-started/custom-driver' },
  }
})
