<script setup lang="ts">
import type { CocktailCard as CocktailCardDto } from '#shared/types/catalog'

withDefaults(defineProps<{
  items: CocktailCardDto[]
  busy?: boolean
}>(), {
  busy: false
})

defineSlots<{
  actions(props: { cocktail: CocktailCardDto }): unknown
}>()

const STAGGER_CAP = 11
const STAGGER_STEP = 45

function riseDelay(index: number): string {
  return `${Math.min(index, STAGGER_CAP) * STAGGER_STEP}ms`
}
</script>

<template>
  <TransitionGroup
    tag="div"
    name="card"
    :aria-busy="busy"
    class="card-grid relative grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    :class="busy && 'is-busy'"
  >
    <CocktailCard
      v-for="(cocktail, index) in items"
      :key="cocktail.id"
      :cocktail="cocktail"
      :eager="index < 4"
      class="card-item animate-rise-in h-full"
      :style="{ animationDelay: riseDelay(index) }"
    >
      <template #actions>
        <slot name="actions" :cocktail="cocktail" />
      </template>
    </CocktailCard>
  </TransitionGroup>
</template>

<style scoped>
.card-grid {
  transition: opacity 0.25s var(--ease-lab);
}

.card-grid.is-busy {
  opacity: 0.5;
  transition: opacity 0.25s var(--ease-lab) 0.2s;
}

.card-move {
  transition: transform 0.5s var(--ease-lab);
}

.card-leave-active {
  transition: none !important;
  animation: none !important;
}

@media (prefers-reduced-motion: reduce) {
  .card-move {
    transition: none;
  }
}
</style>
