// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  extends: ["@nuxt/ui-pro"],
  modules: [
    "@nuxt/content",
    "@nuxt/ui",
    "@nuxthq/studio",
    "@nuxtjs/fontaine",
    "@nuxtjs/google-fonts",
    "nuxt-og-image",
  ],
  ui: {
    icons: ["heroicons", "simple-icons", "mdi", "material-symbols", "fa", "ph"],
  },
  // Fonts
  fontMetrics: {
    fonts: ["Nunito"],
  },
  googleFonts: {
    display: "swap",
    download: true,
    families: {
      Nunito: [400, 500, 600, 700],
    },
  },
  content: {
    highlight: {
      theme: {
        default: "min-dark",
        light: "min-light",
      },
    },
  },
  routeRules: {
    "/api/search.json": { prerender: true },
  },
  // Devtools / Typescript
  devtools: { enabled: true },
  typescript: { strict: false },
});
