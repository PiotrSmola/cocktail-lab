<script setup lang="ts">
import type { IngredientLite } from '#shared/types/catalog'
import { usePantryNames } from './usePantryNames'

const props = withDefaults(defineProps<{
  ingredient: IngredientLite
  unlocksCount: number
  cocktails: string[]
  rank: number
  substitutesFor?: IngredientLite[]
}>(), {
  substitutesFor: () => []
})

const { has, toggle } = usePantry()
const { remember } = usePantryNames()

const owned = computed(() => has(props.ingredient.slug))
const examples = computed(() => props.cocktails.join(' · '))
const coversFor = computed(() => props.substitutesFor ?? [])
const coversSummary = computed(() => coversFor.value.map(item => item.name).join(', '))

function add(): void {
  remember([{
    slug: props.ingredient.slug,
    name: props.ingredient.name,
    imageUrl: props.ingredient.imageUrl
  }])
  toggle(props.ingredient.slug)
}
</script>

<template>
  <div class="unlock-shell group relative h-full rounded-2xl p-px">
    <div
      class="glass-panel glass-panel-strong grain relative flex h-full flex-col gap-4 rounded-2xl border-transparent bg-default/90 p-5"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="font-display text-4xl font-semibold leading-none text-gradient">
            <AnimatedNumber :key="`${ingredient.slug}-${unlocksCount}`" :value="unlocksCount" :duration="900" />
          </p>
          <p class="mt-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-accent-rose">
            new {{ unlocksCount === 1 ? 'drink' : 'drinks' }}
          </p>
        </div>

        <span
          v-if="rank === 1"
          class="inline-flex items-center gap-1 rounded-full border border-lab-amber/45 bg-lab-amber/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-accent"
        >
          Best buy
        </span>
      </div>

      <div class="flex items-center gap-3">
        <span
          class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-default/60 bg-elevated/50"
        >
          <NuxtImg
            v-if="ingredient.imageUrl"
            :src="ingredient.imageUrl"
            :alt="ingredient.name"
            width="96"
            height="96"
            loading="lazy"
            format="webp"
            class="size-full object-contain p-1"
          />
          <UIcon v-else name="i-lucide-flask-round" class="size-5 text-dimmed" />
        </span>

        <div class="min-w-0">
          <p class="truncate font-display text-lg font-semibold text-highlighted">
            {{ ingredient.name }}
          </p>
          <p v-if="examples" class="truncate text-xs text-dimmed">
            {{ examples }}
          </p>
        </div>
      </div>

      <p
        v-if="coversFor.length > 0"
        class="flex items-start gap-1.5 text-xs text-accent-violet"
      >
        <UIcon name="i-lucide-repeat-2" class="mt-0.5 size-3 shrink-0" />
        <span class="min-w-0">Also stands in for {{ coversSummary }}</span>
      </p>

      <UButton
        block
        size="md"
        :color="owned ? 'neutral' : 'primary'"
        :variant="owned ? 'soft' : 'solid'"
        :icon="owned ? 'i-lucide-check' : 'i-lucide-plus'"
        class="mt-auto rounded-full font-semibold"
        :class="owned ? '' : 'glow-rose'"
        :aria-pressed="owned"
        :aria-label="owned
          ? `${ingredient.name} is already in your pantry`
          : `Add ${ingredient.name} to your pantry and unlock ${unlocksCount} more ${unlocksCount === 1 ? 'cocktail' : 'cocktails'}`"
        @click="add"
      >
        {{ owned ? 'In your pantry' : 'Add to pantry' }}
      </UButton>
    </div>
  </div>
</template>

<style scoped>
.unlock-shell {
  background-image: var(--gradient-signature);
  background-size: 220% auto;
  transition:
    transform 0.4s var(--ease-lab),
    box-shadow 0.4s var(--ease-lab);
}

.unlock-shell:hover {
  transform: translateY(-4px);
  box-shadow: 0 24px 60px -30px color-mix(in oklab, var(--color-lab-rose) 75%, transparent);
}
</style>
