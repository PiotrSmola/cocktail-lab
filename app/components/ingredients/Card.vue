<script setup lang="ts">
import type { IngredientCard } from '#shared/types/catalog'

const props = withDefaults(defineProps<{
  ingredient: IngredientCard
  eager?: boolean
}>(), {
  eager: false
})

const abvLabel = computed(() => {
  const value = props.ingredient.abv
  if (value === null) {
    return ''
  }
  return `${Math.round(value * 10) / 10}%`
})

const groupLabel = computed(() => {
  const value = props.ingredient.groupSlug
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : ''
})

const cocktailLabel = computed(() => {
  const value = props.ingredient.cocktailCount
  return `in ${value} ${value === 1 ? 'cocktail' : 'cocktails'}`
})
</script>

<template>
  <article
    class="group glass-panel glass-hover focus-ring-within relative isolate flex h-full flex-col overflow-hidden rounded-2xl p-4 sm:p-5"
  >
    <IngredientsPantryToggle
      :slug="ingredient.slug"
      :name="ingredient.name"
      class="absolute right-3 top-3 z-10"
    />

    <div class="relative flex h-28 items-center justify-center">
      <span
        aria-hidden="true"
        class="pointer-events-none absolute size-24 rounded-full bg-lab-amber/25 blur-2xl transition-all duration-500 ease-lab group-hover:size-28 group-hover:bg-lab-amber/40"
      />
      <span
        aria-hidden="true"
        class="pointer-events-none absolute size-14 rounded-full bg-lab-violet/25 blur-xl"
      />

      <NuxtImg
        v-if="ingredient.imageUrl"
        :src="ingredient.imageUrl"
        :alt="ingredient.name"
        width="180"
        height="180"
        sizes="120px"
        :loading="eager ? 'eager' : 'lazy'"
        format="webp"
        class="relative h-24 w-auto max-w-28 object-contain transition-transform duration-500 ease-lab group-hover:-translate-y-1 group-hover:scale-105"
      />

      <span
        v-else
        class="relative flex size-16 items-center justify-center rounded-2xl border border-default/60 bg-elevated/50 transition-transform duration-500 ease-lab group-hover:scale-105"
      >
        <UIcon name="i-lucide-flask-conical" class="size-7 text-accent" />
      </span>
    </div>

    <h3 class="mt-4 font-display text-base font-semibold leading-snug text-highlighted sm:text-lg">
      <NuxtLink
        :to="`/ingredients/${ingredient.slug}`"
        class="rounded-sm outline-none after:absolute after:inset-0 after:z-0 after:content-['']"
      >
        {{ ingredient.name }}
      </NuxtLink>
    </h3>

    <p v-if="ingredient.type" class="mt-1 truncate text-xs capitalize text-dimmed">
      {{ ingredient.type }}
    </p>

    <div class="mt-3 flex flex-wrap items-center gap-1.5">
      <span
        v-if="groupLabel"
        class="inline-flex items-center rounded-full border border-default/70 bg-elevated/40 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-muted"
      >
        {{ groupLabel }}
      </span>

      <span
        v-if="ingredient.isAlcoholic && abvLabel"
        class="inline-flex items-center rounded-full border border-lab-amber/40 bg-lab-amber/10 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wider text-accent"
      >
        <span v-if="ingredient.abvEstimated" class="mr-0.5 text-dimmed">≈</span>{{ abvLabel }}
      </span>

      <span
        v-if="!ingredient.isAlcoholic"
        class="inline-flex items-center gap-1 rounded-full border border-lab-mint/45 bg-lab-mint/12 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-accent-mint"
      >
        <UIcon name="i-lucide-leaf" class="size-3" />
        Zero proof
      </span>
    </div>

    <p class="mt-auto flex items-center gap-1.5 pt-4 text-xs text-muted">
      <UIcon name="i-lucide-martini" class="size-3.5 shrink-0 text-accent-rose" />
      {{ cocktailLabel }}
    </p>
  </article>
</template>
