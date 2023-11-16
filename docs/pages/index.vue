<script setup lang="ts">
const navigation = inject('navigation')

definePageMeta({
  colorMode: 'dark',
})

const title = 'Unstorage'
const description = 'Unstorage provides an async Key-Value storage API with conventional features like multi driver mounting, watching and working with metadata, dozens of built-in drivers and a tiny core.'

useSeoMeta({
  titleTemplate: '',
  title,
  ogTitle: title,
  description,
  ogDescription: description,
  // ogImage: 'https://devtools.nuxt.com/social-card.png',
  // twitterImage: 'https://devtools.nuxt.com/social-card.png',
})

console.log('navigation', navigation)
</script>

<template>
  <UMain>
      <UContainer>
        <UPage>
          <template #left>
            <UAside>
              <template #top>
                <UDocsSearchButton size="md" />
              </template>
              <UNavigationTree :links="mapContentNavigation(navigation)" />
            </UAside>
          </template>
          <slot />
        </UPage>
      </UContainer>
    </UMain>
</template>
