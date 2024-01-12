
import { updateAppConfig } from '#app/config'
import { defuFn } from 'defu'

const inlineConfig = {
  "nuxt": {
    "buildId": "dev"
  },
  "ui": {
    "primary": "green",
    "gray": "cool",
    "colors": [
      "red",
      "orange",
      "amber",
      "yellow",
      "lime",
      "green",
      "emerald",
      "teal",
      "cyan",
      "sky",
      "blue",
      "indigo",
      "violet",
      "purple",
      "fuchsia",
      "pink",
      "rose",
      "theme",
      "primary"
    ],
    "strategy": "merge"
  }
}

// Vite - webpack is handled directly in #app/config
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    updateAppConfig(newModule.default)
  })
}

import cfg0 from "/Users/atinux/Projects/unjs/unstorage/docs/app.config.ts"
import cfg1 from "/Users/atinux/Projects/unjs/unstorage/docs/_theme/app.config.ts"
import cfg2 from "/Users/atinux/Projects/unjs/unstorage/docs/node_modules/.pnpm/@nuxt+ui-pro@0.7.0_nuxt@3.9.1_vite@5.0.11_vue@3.3.13/node_modules/@nuxt/ui-pro/app.config.ts"

export default /*@__PURE__*/ defuFn(cfg0, cfg1, cfg2, inlineConfig)
