<script setup lang="ts">
withDefaults(defineProps<{
  delay?: number
}>(), {
  delay: 0
})
</script>

<template>
  <div
    class="glass-panel flex h-full flex-col overflow-hidden rounded-2xl p-4 sm:p-5"
    aria-hidden="true"
    :style="{ '--shimmer-delay': `${delay}ms` }"
  >
    <div class="flex h-28 items-center justify-center">
      <div class="shimmer size-20 rounded-full bg-elevated/60" />
    </div>

    <div class="mt-4 flex flex-col gap-2.5">
      <div class="shimmer h-4 w-3/4 rounded-full bg-elevated/70" />
      <div class="shimmer h-3 w-1/3 rounded-full bg-elevated/50" />
    </div>

    <div class="mt-4 flex gap-1.5">
      <div class="shimmer h-4 w-14 rounded-full bg-elevated/60" />
      <div class="shimmer h-4 w-10 rounded-full bg-elevated/40" />
    </div>

    <div class="shimmer mt-6 h-3 w-24 rounded-full bg-elevated/50" />
  </div>
</template>
