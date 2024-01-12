<script setup lang="ts">
import type { NavItem } from "@nuxt/content/dist/runtime/types";

const navigation = inject<NavItem[]>("navigation", []);
const appConfig = useAppConfig();

const { data: stars } = await useFetch<{ repo: { stars: number } }>('https://ungh.cc/repos/' + appConfig.github, {
  transform: (data) =>(data.repo.stars)
})
const { data: tag } = await useFetch<{ release: { tag: string } }>(`https://ungh.cc/repos/${appConfig.github}/releases/latest`, {
  transform: (data) => (data.release.tag)
})

const activeClassButton = 'bg-primary bg-opacity-40 dark:bg-opacity-30'
</script>

<template>
  <UHeader :ui="{ logo: 'items-center' }" :links="mapContentNavigation(navigation)">
    <template #logo>
      <img :src="appConfig.logo" :alt="`${appConfig.name} logo`" class="h-7 w-7" />
      <span>
        {{ appConfig.name }}
      </span>
      <UBadge v-if="tag" :label="(tag as string)" color="primary" variant="subtle" size="xs" />
    </template>

    <template #center>
      <UDocsSearchButton class="hidden lg:flex" />
    </template>

    <template #right>
      <UTooltip v-if="stars" class="hidden lg:flex" :text="`${appConfig.name} GitHub Stars`">
        <UButton
          icon="i-simple-icons-github" :to="`https://github.com/${appConfig.github}`" target="_blank" aria-label="Visit repository" v-bind="{ ...$ui.button?.secondary }" square
        >
          {{ formatNumber(stars) }}
        </UButton>
      </UTooltip>
    </template>

    <template #panel>
      <UNavigationTree :links="mapContentNavigation(navigation)" />
    </template>
  </UHeader>
</template>
