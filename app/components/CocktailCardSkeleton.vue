<script setup lang="ts">
withDefaults(defineProps<{
  delay?: number
}>(), {
  delay: 0
})
</script>

<template>
  <div
    class="glass-panel flex flex-col overflow-hidden rounded-2xl"
    aria-hidden="true"
    :style="{ '--shimmer-delay': `${delay}ms` }"
  >
    <div class="shimmer aspect-square w-full bg-elevated/60">
      <div class="flex size-full items-center justify-center">
        <UIcon name="i-lucide-martini" class="size-8 text-dimmed/40" />
      </div>
    </div>

    <div class="flex flex-col gap-2.5 p-4">
      <div class="shimmer h-4 w-3/4 rounded-full bg-elevated/70" />
      <div class="shimmer h-3 w-1/2 rounded-full bg-elevated/50" />
      <div class="mt-2 h-px w-8 rounded-full bg-elevated/80" />
    </div>
  </div>
</template>
