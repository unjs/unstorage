import Highlight from '/Users/atinux/Projects/unjs/unstorage/docs/node_modules/.pnpm/@nuxtjs+mdc@0.3.0/node_modules/@nuxtjs/mdc/dist/runtime/shiki/index.mjs'

export const remarkPlugins = {
}

export const rehypePlugins = {
  'highlight': { instance: Highlight, options: {"src":"/Users/atinux/Projects/unjs/unstorage/docs/node_modules/.pnpm/@nuxtjs+mdc@0.3.0/node_modules/@nuxtjs/mdc/dist/runtime/shiki/index.mjs"} },
}

export const highlight = {"theme":{"light":"min-light","default":"min-dark","dark":"material-theme-palenight"},"preload":["json","js","ts","html","css","vue","diff","shell","markdown","yaml","bash","ini"]}