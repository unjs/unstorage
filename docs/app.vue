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
  <UHeader>
    <template #logo>
      <div class="text-gray-950 dark:text-white text-2xl">
          💾 Unstorage
      </div>
    </template>

    <template #right>
      <UColorModeButton v-if="!$colorMode.forced" />
      <UButton
        aria-label="Unjs on X" icon="i-simple-icons-x"
        to="https://twitter.com/unjsio"
        target="_blank" color="gray" variant="ghost"
      />
      <UButton
        aria-label="Unstorage on GitHub" icon="i-simple-icons-github"
        to="https://github.com/unjs/unstorage"
        target="_blank" color="gray" variant="ghost"
      />
    </template>

    <template v-if="$route.path !== '/'" #panel>
      <LazyUDocsSearchButton size="md" class="mb-4 w-full" />
      <LazyUNavigationTree :links="mapContentNavigation(navigation)" default-open :multiple="false" />
    </template>
  </UHeader>

  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>

  <UFooter>
    <template #right>
      <UColorModeButton v-if="!$colorMode.forced" />
      <UButton
        aria-label="Unjs Website" icon="i-simple-icons-javascript"
        to="https://unjs.io/"
        target="_blank" color="gray" variant="ghost"
      />
      <UButton
        aria-label="Unjs on X" icon="i-simple-icons-x"
        to="https://twitter.com/unjsio"
        target="_blank" color="gray" variant="ghost"
      />
      <UButton
        aria-label="Unstorage on GitHub" icon="i-simple-icons-github"
        to="https://github.com/unjs/unstorage"
        target="_blank" color="gray" variant="ghost"
      />
    </template>
  </UFooter>
  <ClientOnly>
    <LazyUDocsSearch :files="files" :navigation="navigation" :links="links" />
  </ClientOnly>
</template>
