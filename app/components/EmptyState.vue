<script setup lang="ts">
withDefaults(defineProps<{
  icon?: string
  title: string
  hint?: string
  compact?: boolean
}>(), {
  icon: 'i-lucide-search-x',
  hint: '',
  compact: false
})
</script>

<template>
  <div
    class="glass-panel grain flex flex-col items-center justify-center gap-4 text-center"
    :class="compact ? 'px-6 py-10' : 'px-6 py-16 sm:px-10 sm:py-20'"
  >
    <span
      class="relative flex size-16 items-center justify-center rounded-full border border-default/60 bg-gradient-to-br from-lab-amber/20 via-lab-rose/15 to-lab-violet/20"
    >
      <UIcon :name="icon" class="size-7 text-accent" />
    </span>

    <div class="space-y-2">
      <p class="font-display text-xl font-semibold text-highlighted sm:text-2xl">
        {{ title }}
      </p>
      <p v-if="hint" class="mx-auto max-w-md text-sm text-muted">
        {{ hint }}
      </p>
      <slot name="hint" />
    </div>

    <div v-if="$slots.default" class="pt-1">
      <slot />
    </div>
  </div>
</template>
