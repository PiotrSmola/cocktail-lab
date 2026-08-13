<script setup lang="ts">
defineProps<{
  chips: { key: string, label: string }[]
}>()

const emit = defineEmits<{
  remove: [key: string]
  clear: []
}>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <span class="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-dimmed">
      Active
    </span>

    <button
      v-for="chip in chips"
      :key="chip.key"
      type="button"
      :aria-label="`Remove filter: ${chip.label}`"
      class="group inline-flex items-center gap-1.5 rounded-full border border-lab-violet/40 bg-lab-violet/10 py-1 pl-3 pr-1.5 text-xs font-medium text-highlighted backdrop-blur transition-[color,background-color,border-color,transform] duration-300 ease-lab hover:-translate-y-0.5 hover:border-lab-rose/50 active:scale-[0.97]"
      @click="emit('remove', chip.key)"
    >
      {{ chip.label }}
      <span
        class="flex size-4 items-center justify-center rounded-full bg-elevated/70 transition-colors duration-300 group-hover:bg-lab-rose/30"
        aria-hidden="true"
      >
        <UIcon name="i-lucide-x" class="size-3 text-dimmed transition-colors duration-300 group-hover:text-accent-rose" />
      </span>
    </button>

    <button
      type="button"
      class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-accent-rose underline-offset-4 transition-colors duration-300 hover:underline"
      @click="emit('clear')"
    >
      <UIcon name="i-lucide-filter-x" class="size-3.5" />
      Clear all
    </button>
  </div>
</template>
