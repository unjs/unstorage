// Generated by nitro
import type { Serialize, Simplify } from 'nitropack'
declare module 'nitropack' {
  type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T
  interface InternalApi {
    '/api/search.json': {
      'get': Simplify<Serialize<Awaited<ReturnType<typeof import('../../_theme/server/api/search.json.get').default>>>>
    }
    '/__nuxt_error': {
      'default': Simplify<Serialize<Awaited<ReturnType<typeof import('../../node_modules/.pnpm/nuxt@3.9.1_eslint@8.56.0_typescript@5.3.3_vite@5.0.11_vue-tsc@1.8.27/node_modules/nuxt/dist/core/runtime/nitro/renderer').default>>>>
    }
    '/api/_mdc/highlight': {
      'default': Simplify<Serialize<Awaited<ReturnType<typeof import('../../node_modules/.pnpm/@nuxtjs+mdc@0.3.0/node_modules/@nuxtjs/mdc/dist/runtime/shiki/event-handler').default>>>>
    }
    '/__site-config__/debug.json': {
      'default': Simplify<Serialize<Awaited<ReturnType<typeof import('../../node_modules/.pnpm/nuxt-site-config@1.6.7_@nuxt+devtools@1.0.8_@vue+compiler-core@3.4.10_nuxt@3.9.1_postcss@8.4._ck4efiyoe4jhtk6pzlq4kpsodq/node_modules/nuxt-site-config/dist/runtime/nitro/routes/__site-config__/debug').default>>>>
    }
    '/api/og-image-html': {
      'default': Simplify<Serialize<Awaited<ReturnType<typeof import('../../node_modules/.pnpm/nuxt-og-image@2.2.4_@nuxt+devtools@1.0.8_@vue+compiler-core@3.4.10_nuxt@3.9.1_postcss@8.4.33__rv5seja7eaudj7eewivm5fnaii/node_modules/nuxt-og-image/dist/runtime/nitro/routes/html').default>>>>
    }
    '/api/og-image-options': {
      'default': Simplify<Serialize<Awaited<ReturnType<typeof import('../../node_modules/.pnpm/nuxt-og-image@2.2.4_@nuxt+devtools@1.0.8_@vue+compiler-core@3.4.10_nuxt@3.9.1_postcss@8.4.33__rv5seja7eaudj7eewivm5fnaii/node_modules/nuxt-og-image/dist/runtime/nitro/routes/options').default>>>>
    }
    '/api/og-image-svg': {
      'default': Simplify<Serialize<Awaited<ReturnType<typeof import('../../node_modules/.pnpm/nuxt-og-image@2.2.4_@nuxt+devtools@1.0.8_@vue+compiler-core@3.4.10_nuxt@3.9.1_postcss@8.4.33__rv5seja7eaudj7eewivm5fnaii/node_modules/nuxt-og-image/dist/runtime/nitro/routes/svg').default>>>>
    }
    '/api/og-image-vnode': {
      'default': Simplify<Serialize<Awaited<ReturnType<typeof import('../../node_modules/.pnpm/nuxt-og-image@2.2.4_@nuxt+devtools@1.0.8_@vue+compiler-core@3.4.10_nuxt@3.9.1_postcss@8.4.33__rv5seja7eaudj7eewivm5fnaii/node_modules/nuxt-og-image/dist/runtime/nitro/routes/vnode').default>>>>
    }
    '/api/og-image-font': {
      'default': Simplify<Serialize<Awaited<ReturnType<typeof import('../../node_modules/.pnpm/nuxt-og-image@2.2.4_@nuxt+devtools@1.0.8_@vue+compiler-core@3.4.10_nuxt@3.9.1_postcss@8.4.33__rv5seja7eaudj7eewivm5fnaii/node_modules/nuxt-og-image/dist/runtime/nitro/routes/font').default>>>>
    }
    '/api/_content/query/:qid/**:params': {
      'get': Simplify<Serialize<Awaited<ReturnType<typeof import('../../node_modules/.pnpm/@nuxt+content@2.10.0_nuxt@3.9.1_vue@3.3.13/node_modules/@nuxt/content/dist/runtime/server/api/query').default>>>>
    }
    '/api/_content/query/:qid': {
      'get': Simplify<Serialize<Awaited<ReturnType<typeof import('../../node_modules/.pnpm/@nuxt+content@2.10.0_nuxt@3.9.1_vue@3.3.13/node_modules/@nuxt/content/dist/runtime/server/api/query').default>>>>
    }
    '/api/_content/query': {
      'get': Simplify<Serialize<Awaited<ReturnType<typeof import('../../node_modules/.pnpm/@nuxt+content@2.10.0_nuxt@3.9.1_vue@3.3.13/node_modules/@nuxt/content/dist/runtime/server/api/query').default>>>>
    }
    '/api/_content/cache.json': {
      'get': Simplify<Serialize<Awaited<ReturnType<typeof import('../../node_modules/.pnpm/@nuxt+content@2.10.0_nuxt@3.9.1_vue@3.3.13/node_modules/@nuxt/content/dist/runtime/server/api/cache').default>>>>
    }
    '/api/_content/navigation/:qid/**:params': {
      'get': Simplify<Serialize<Awaited<ReturnType<typeof import('../../node_modules/.pnpm/@nuxt+content@2.10.0_nuxt@3.9.1_vue@3.3.13/node_modules/@nuxt/content/dist/runtime/server/api/navigation').default>>>>
    }
    '/api/_content/navigation/:qid': {
      'get': Simplify<Serialize<Awaited<ReturnType<typeof import('../../node_modules/.pnpm/@nuxt+content@2.10.0_nuxt@3.9.1_vue@3.3.13/node_modules/@nuxt/content/dist/runtime/server/api/navigation').default>>>>
    }
    '/api/_content/navigation': {
      'get': Simplify<Serialize<Awaited<ReturnType<typeof import('../../node_modules/.pnpm/@nuxt+content@2.10.0_nuxt@3.9.1_vue@3.3.13/node_modules/@nuxt/content/dist/runtime/server/api/navigation').default>>>>
    }
  }
}
export {}