<script setup lang="ts">
import { _theme } from '#tailwind-config/theme/colors'
import type { ParsedContent } from "@nuxt/content/dist/runtime/types";

const appConfig = useAppConfig();
const { data: navigation } = await useAsyncData("navigation", () =>
  fetchContentNavigation(),
);
const { data: files } = useLazyFetch<ParsedContent[]>("/api/search.json", {
  default: () => [],
  server: false,
});

const separator = "·";
const defaultLang = "en";
const dir = "ltr";

useHead({
  htmlAttrs: {
    lang: defaultLang,
    dir,
    class: "scroll-smooth"
  },
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'theme-color', content: _theme[500] },
  ],
  link: [
    { rel: "icon", href: "/icon.svg" }
  ],
});

useSeoMeta({
  ogType: "website",
  ogSiteName: appConfig.name,
  twitterCard: "summary_large_image",
  twitterSite: 'unjsios',
});

provide("navigation", navigation);
</script>

<template>
  <div>
    <Header />

    <UMain>
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </UMain>

    <Footer />

    <ClientOnly>
      <LazyUDocsSearch :files="files" :navigation="navigation" />
    </ClientOnly>

    <UNotifications />
  </div>
</template>
