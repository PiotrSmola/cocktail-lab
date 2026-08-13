<script setup lang="ts">
defineProps<{
  spirits: { value: string, count: number }[]
  active: string
}>()

const emit = defineEmits<{ select: [value: string] }>()

const SPIRIT_LOOK: Record<string, { label: string, icon: string }> = {
  rum: { label: 'Rum', icon: 'i-lucide-palmtree' },
  gin: { label: 'Gin', icon: 'i-lucide-sprout' },
  vodka: { label: 'Vodka', icon: 'i-lucide-snowflake' },
  tequila: { label: 'Tequila', icon: 'i-lucide-flame' },
  whiskey: { label: 'Whiskey', icon: 'i-lucide-barrel' },
  brandy: { label: 'Brandy', icon: 'i-lucide-grape' }
}

const FALLBACK = { label: 'Spirit', icon: 'i-lucide-flask-round' }

function look(value: string): { label: string, icon: string } {
  return SPIRIT_LOOK[value] ?? FALLBACK
}
</script>

<template>
  <div role="group" aria-label="Filter by base spirit" class="flex flex-wrap gap-2">
    <button
      v-for="spirit in spirits"
      :key="spirit.value"
      type="button"
      :aria-pressed="active === spirit.value"
      class="glass-panel group flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-300 ease-lab hover:-translate-y-0.5 active:scale-[0.97]"
      :class="active === spirit.value
        ? 'border-lab-amber/55 bg-lab-amber/15 text-accent glow-amber'
        : 'text-muted hover:border-lab-amber/40 hover:text-highlighted'"
      @click="emit('select', active === spirit.value ? '' : spirit.value)"
    >
      <UIcon
        :name="look(spirit.value).icon"
        class="size-4 shrink-0 transition-transform duration-300 ease-lab group-hover:scale-110"
        :class="active === spirit.value ? 'text-accent' : 'text-accent-violet'"
      />
      {{ look(spirit.value).label }}
      <span
        class="rounded-full px-1.5 py-0.5 text-[0.7rem] font-semibold tabular-nums transition-colors duration-300"
        :class="active === spirit.value ? 'bg-lab-amber/25 text-accent' : 'bg-elevated/60 text-dimmed'"
      >
        {{ spirit.count }}
      </span>
    </button>
  </div>
</template>
