<script setup lang="ts">
import type { CocktailCard, IngredientLite } from '#shared/types/catalog'
import type { PantrySubstitution } from '#shared/types/pantry'
import { usePantryNames } from './usePantryNames'

const props = withDefaults(defineProps<{
  cocktail: CocktailCard
  missing: IngredientLite[]
  substitutions?: PantrySubstitution[]
}>(), {
  substitutions: () => [],
})

const { toggle } = usePantry()
const { remember } = usePantryNames()

const oneAway = computed(() => props.missing.length === 1)
const standIns = computed(() => props.substitutions ?? [])
const standInSummary = computed(() => standIns.value
  .map(line => `${line.substitute.name} for ${line.required.name}`)
  .join(' · '))

function add(ingredient: IngredientLite): void {
  remember([{ slug: ingredient.slug, name: ingredient.name, imageUrl: ingredient.imageUrl }])
  toggle(ingredient.slug)
}
</script>

<template>
  <GlassPanel
    hover
    :padded="false"
    class="flex items-center gap-4 p-3.5 sm:p-4"
    :class="oneAway ? 'border-lab-amber/35 bg-lab-amber/[0.06]' : ''"
  >
    <span
      class="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-default/60 bg-elevated/50 sm:size-16"
    >
      <NuxtImg
        v-if="cocktail.imageUrl"
        :src="cocktail.imageUrl"
        :alt="cocktail.name"
        width="128"
        height="128"
        loading="lazy"
        format="webp"
        class="size-full object-cover"
      />
      <UIcon v-else name="i-lucide-martini" class="size-5 text-dimmed" />
    </span>

    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h3 class="font-display text-base font-semibold leading-tight text-highlighted">
          <NuxtLink
            :to="`/cocktails/${cocktail.slug}`"
            class="rounded-sm transition-colors duration-300 hover:text-accent"
          >
            {{ cocktail.name }}
          </NuxtLink>
        </h3>
        <span
          v-if="oneAway"
          class="inline-flex items-center gap-1 rounded-full border border-lab-amber/45 bg-lab-amber/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-accent"
        >
          One away
        </span>
      </div>

      <p v-if="cocktail.category" class="mt-0.5 truncate text-xs text-dimmed">
        {{ cocktail.category }}
      </p>

      <p
        v-if="standIns.length > 0"
        class="mt-1 flex items-start gap-1.5 text-xs text-accent-violet"
      >
        <UIcon name="i-lucide-repeat-2" class="mt-0.5 size-3 shrink-0" />
        <span class="min-w-0">Standing in: {{ standInSummary }}</span>
      </p>

      <ul class="mt-2 flex flex-wrap gap-1.5">
        <li v-for="ingredient in missing" :key="ingredient.id">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-300 ease-lab active:scale-95"
            :class="oneAway
              ? 'border-lab-amber/55 text-accent hover:bg-lab-amber/15'
              : 'border-lab-amber/30 text-muted hover:border-lab-amber/55 hover:text-accent'"
            :aria-label="`Add ${ingredient.name} to your pantry to unlock ${cocktail.name}`"
            @click="add(ingredient)"
          >
            {{ ingredient.name }}
            <UIcon name="i-lucide-plus" class="size-3" />
          </button>
        </li>
      </ul>
    </div>
  </GlassPanel>
</template>
