<script setup lang="ts">
import { STRENGTH_BANDS } from '#shared/types/catalog'
import type { StrengthBandValue } from '#shared/types/catalog'

interface StrengthTarget {
  path: string
  query: Record<string, string>
}

const props = defineProps<{
  bands: { value: StrengthBandValue, count: number }[]
  active: string
  to: (value: string) => StrengthTarget
}>()

const BAND_ICONS: Record<string, string> = {
  zero: 'i-lucide-leaf',
  easy: 'i-lucide-feather',
  balanced: 'i-lucide-scale',
  strong: 'i-lucide-flame',
  'spirit-forward': 'i-lucide-zap'
}

const FALLBACK_ICON = 'i-lucide-flask-round'

const entries = computed(() => props.bands.map(band => ({
  value: band.value,
  count: band.count,
  label: STRENGTH_BANDS.find(entry => entry.value === band.value)?.label ?? band.value,
  icon: BAND_ICONS[band.value] ?? FALLBACK_ICON
})))
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <span class="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-dimmed">
      Strength
    </span>

    <div role="group" aria-label="Filter by drink strength" class="flex flex-wrap gap-2">
      <NuxtLink
        v-for="entry in entries"
        :key="entry.value"
        :to="to(entry.value)"
        :aria-current="active === entry.value ? 'page' : undefined"
        class="glass-panel group flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-300 ease-lab hover:-translate-y-0.5 active:scale-[0.97]"
        :class="active === entry.value
          ? 'border-lab-violet/55 bg-lab-violet/15 text-accent-violet'
          : 'text-muted hover:border-lab-violet/40 hover:text-highlighted'"
      >
        <UIcon
          :name="entry.icon"
          class="size-4 shrink-0 transition-transform duration-300 ease-lab group-hover:scale-110"
          :class="active === entry.value ? 'text-accent-violet' : 'text-accent-mint'"
        />
        {{ entry.label }}
        <span
          class="rounded-full px-1.5 py-0.5 text-[0.7rem] font-semibold tabular-nums transition-colors duration-300"
          :class="active === entry.value ? 'bg-lab-violet/25 text-accent-violet' : 'bg-elevated/60 text-dimmed'"
        >
          {{ entry.count }}
        </span>
      </NuxtLink>
    </div>
  </div>
</template>
