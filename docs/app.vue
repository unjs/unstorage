<script setup>
useServerSeoMeta({
  ogSiteName: 'Unstorage',
  twitterCard: 'summary_large_image',
})

useHead({
  htmlAttrs: {
    lang: 'en',
  },
})

const { data: files } = useLazyFetch('/api/search.json', {
  default: () => [],
  server: false,
})
const { data: navigation } = await useAsyncData('navigation', () => fetchContentNavigation())

// Provide
provide('navigation', navigation)
</script>

<template>
  <Header />

  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>

  <Footer />

  <ClientOnly>
    <LazyUDocsSearch :files="files" :navigation="navigation" :links="links" />
  </ClientOnly>
</template>
