export default defineNuxtConfig({
  extends: "@nuxt-themes/docus",
  modules: ["@nuxtjs/plausible"],
  nitro: {
    future: {
      nativeSWR: true
    }
  }
});
