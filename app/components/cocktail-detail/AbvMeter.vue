<script setup lang="ts">
import type { CocktailIngredientLine } from '#shared/types/catalog'

const props = defineProps<{
  lines: CocktailIngredientLine[]
  instructions: string
}>()

const FULL_BAR_ABV = 40

const method = computed(() => detectDilution(props.instructions))

const estimate = computed(() => estimateAbv(
  props.lines.map(line => ({
    amountMl: line.amountMl,
    ingredient: {
      abv: line.ingredient.abv,
      abvEstimated: line.ingredient.abvEstimated,
      isAlcoholic: line.ingredient.isAlcoholic
    }
  })),
  method.value
))

const abv = computed(() => estimate.value.abv)
const measurable = computed(() => abv.value !== null)

const readout = computed(() => {
  const value = abv.value
  if (value === null) return 'Not enough measures'
  if (value <= 0) return '0% — zero proof'
  return `${estimate.value.estimated ? '≈ ' : ''}${value.toFixed(1)}% ABV`
})

const strength = computed(() => {
  const value = abv.value
  if (value === null) return 'unmeasured'
  if (value <= 0) return 'zero proof'
  if (value < 10) return 'easy going'
  if (value < 20) return 'balanced'
  if (value < 30) return 'strong'
  return 'spirit-forward'
})

const fill = computed(() => {
  const ratio = Math.min(Math.max((abv.value ?? 0) / FULL_BAR_ABV, 0), 1)
  return `${Math.round(ratio * 1000) / 10}%`
})
</script>

<template>
  <RevealOnScroll v-slot="{ visible }" :y="14">
    <GlassPanel class="relative">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-accent-rose">
            Strength
          </p>
          <p class="mt-2 font-display text-3xl font-semibold text-highlighted sm:text-4xl">
            {{ readout }}
          </p>
        </div>

        <span
          class="inline-flex items-center gap-1.5 rounded-full border border-default/60 bg-elevated/40 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted"
        >
          <UIcon name="i-lucide-flame" class="size-3.5 text-accent" />
          {{ strength }}
        </span>
      </div>

      <div v-if="measurable" class="mt-6">
        <div
          aria-hidden="true"
          class="h-2.5 w-full overflow-hidden rounded-full border border-default/50 bg-elevated/60"
        >
          <span
            class="abv-fill block h-full rounded-full bg-gradient-to-r from-lab-amber via-lab-gold to-lab-rose"
            :class="visible && 'is-visible'"
            :style="{ '--abv-fill': fill }"
          />
        </div>

        <div class="mt-2.5 flex items-center justify-between text-[0.65rem] font-medium uppercase tracking-[0.16em] text-dimmed">
          <span>0%</span>
          <span>40%+</span>
        </div>
      </div>

      <p class="mt-5 text-xs leading-relaxed text-dimmed">
        <template v-if="measurable">
          estimated with {{ method }} dilution
        </template>
        <template v-else>
          The spirits in this one are poured by eye, so there is nothing solid to run the numbers on.
        </template>
      </p>
    </GlassPanel>
  </RevealOnScroll>
</template>

<style scoped>
.abv-fill {
  width: 0;
  transition: width 0.9s var(--ease-lab) 0.12s;
}

.abv-fill.is-visible {
  width: var(--abv-fill);
}

@media (scripting: none) {
  .abv-fill {
    width: var(--abv-fill);
  }
}
</style>
