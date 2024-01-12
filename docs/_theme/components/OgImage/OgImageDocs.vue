<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()

const appConfig = useAppConfig()
</script>

<template>
  <!-- Since we use Nuxt UI which replace color by some vars, we need to explicitely set a color. -->
  <div
    class="w-full h-full flex justify-between relative bg-[#111827] text-white"
  >
    <img src="http://unjs.io/assets/header/ellipse.png" class="absolute top--64 right--64">
    <div class="pt-[120px] px-[60px] pb-[60px]">
      <div class="h-full w-full justify-between relative">
        <div class="flex flex-row justify-between items-start">
          <div class="flex flex-col space-x-3">
            <h1 class="my-0 font-bold text-[56px] text-white">
              {{ title }}
            </h1>
            <p
              class="text-[36px] text-[#9ca3af] max-w-[768px]"
            >
              {{ description }}
            </p>
          </div>
        </div>
        <div class="">
          <img src="/icon.svg" class="rounded-sm h-[60px] w-[60px]">
        </div>
      </div>
    </div>
  </div>
</template>
