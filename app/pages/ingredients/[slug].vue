<script setup lang="ts">
import type { CocktailCard as CocktailCardDto, IngredientCard } from '#shared/types/catalog'

type IngredientDetail = IngredientCard & { cocktails: CocktailCardDto[] }

const LONG_DESCRIPTION = 420
const META_DESCRIPTION_LENGTH = 155

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? ''))

const { data: ingredient } = await useAsyncData(
  () => `ingredient-${slug.value}`,
  () => $fetch<IngredientDetail>(`/api/ingredients/${slug.value}`),
  { default: () => null }
)

if (!ingredient.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Ingredient not found',
    fatal: true
  })
}

const expanded = ref(false)
const descriptionId = useId()

const cocktails = computed<CocktailCardDto[]>(() => ingredient.value?.cocktails ?? [])
const cocktailCount = computed(() => ingredient.value?.cocktailCount ?? 0)

const paragraphs = computed(() => (ingredient.value?.description ?? '')
  .split(/\r?\n\s*/)
  .map(entry => entry.trim())
  .filter(entry => entry.length > 0))

const isLongDescription = computed(() => (ingredient.value?.description ?? '').length > LONG_DESCRIPTION)

const groupLabel = computed(() => {
  const value = ingredient.value?.groupSlug
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : ''
})

const abvLabel = computed(() => {
  const value = ingredient.value?.abv
  if (value === null || value === undefined) {
    return ''
  }
  return `${Math.round(value * 10) / 10}%`
})

const cocktailsHeading = computed(() => `Cocktails with ${ingredient.value?.name ?? 'this ingredient'}`)

const metaDescription = computed(() => {
  const name = ingredient.value?.name ?? 'This ingredient'
  const description = ingredient.value?.description
  if (description) {
    const flat = description.replace(/\s+/g, ' ').trim()
    return flat.length > META_DESCRIPTION_LENGTH
      ? `${flat.slice(0, META_DESCRIPTION_LENGTH).trimEnd()}…`
      : flat
  }
  return `${name} is used in ${cocktailCount.value} ${cocktailCount.value === 1 ? 'cocktail' : 'cocktails'} in the Cocktail Lab catalogue.`
})

watch(slug, () => {
  expanded.value = false
})

useSeoMeta({
  title: () => `${ingredient.value?.name ?? 'Ingredient'} — ingredient`,
  description: () => metaDescription.value,
  ogTitle: () => `${ingredient.value?.name ?? 'Ingredient'} — Cocktail Lab`,
  ogDescription: () => metaDescription.value,
  ogImage: () => ingredient.value?.imageUrl ?? undefined
})
</script>

<template>
  <div v-if="ingredient">
    <section class="relative isolate overflow-hidden border-b border-default/60">
      <div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10">
        <span class="orb -left-24 -top-32 size-80 bg-lab-amber/40" style="animation-duration: 28s" />
        <span
          class="orb right-0 -top-40 size-96 bg-lab-violet/40"
          style="animation-duration: 34s; animation-delay: -11s"
        />
      </div>

      <div class="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <nav aria-label="Breadcrumb">
          <ol class="flex flex-wrap items-center gap-2 text-sm text-dimmed">
            <li>
              <NuxtLink
                to="/ingredients"
                class="font-medium transition-colors duration-300 hover:text-accent"
              >
                Ingredients
              </NuxtLink>
            </li>
            <li aria-hidden="true">
              <UIcon name="i-lucide-chevron-right" class="size-3.5" />
            </li>
            <li class="font-medium text-muted" aria-current="page">
              {{ ingredient.name }}
            </li>
          </ol>
        </nav>

        <div class="mt-8 grid gap-8 sm:gap-10 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-center">
          <div class="relative mx-auto flex size-56 items-center justify-center sm:size-64 lg:mx-0">
            <span
              aria-hidden="true"
              class="pointer-events-none absolute inset-4 rounded-full bg-lab-amber/30 blur-3xl"
            />
            <span
              aria-hidden="true"
              class="pointer-events-none absolute inset-10 rounded-full bg-lab-violet/30 blur-2xl"
            />

            <div
              class="glass-panel glass-panel-strong grain relative flex size-full items-center justify-center rounded-full"
            >
              <NuxtImg
                v-if="ingredient.imageUrl"
                :src="ingredient.imageUrl"
                :alt="ingredient.name"
                width="320"
                height="320"
                sizes="256px"
                loading="eager"
                fetchpriority="high"
                format="webp"
                class="relative max-h-[62%] w-auto max-w-[62%] object-contain"
              />
              <UIcon v-else name="i-lucide-flask-conical" class="size-16 text-accent" />
            </div>
          </div>

          <div>
            <h1
              class="animate-rise-in font-display text-4xl font-semibold leading-[1.05] text-highlighted sm:text-5xl lg:text-6xl"
            >
              {{ ingredient.name }}
            </h1>

            <div class="animate-rise-in mt-5 flex flex-wrap items-center gap-2" style="animation-delay: 90ms">
              <span
                v-if="groupLabel"
                class="inline-flex items-center gap-1.5 rounded-full border border-default/70 bg-elevated/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted"
              >
                <UIcon name="i-lucide-layers" class="size-3.5" />
                {{ groupLabel }}
              </span>

              <span
                v-if="ingredient.type"
                class="inline-flex items-center gap-1.5 rounded-full border border-default/70 bg-elevated/40 px-3 py-1 text-xs font-semibold capitalize tracking-wide text-muted"
              >
                <UIcon name="i-lucide-shapes" class="size-3.5" />
                {{ ingredient.type }}
              </span>

              <span
                v-if="ingredient.isAlcoholic && abvLabel"
                class="inline-flex items-center gap-1.5 rounded-full border border-lab-amber/45 bg-lab-amber/12 px-3 py-1 text-xs font-semibold tracking-wide text-accent"
              >
                <UIcon name="i-lucide-flame" class="size-3.5" />
                <span><span v-if="ingredient.abvEstimated" class="text-dimmed">≈</span>{{ abvLabel }} ABV</span>
              </span>

              <span
                v-if="!ingredient.isAlcoholic"
                class="inline-flex items-center gap-1.5 rounded-full border border-lab-mint/45 bg-lab-mint/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-accent-mint"
              >
                <UIcon name="i-lucide-leaf" class="size-3.5" />
                Zero proof
              </span>

              <span
                class="inline-flex items-center gap-1.5 rounded-full border border-default/70 bg-elevated/40 px-3 py-1 text-xs font-semibold tracking-wide text-muted"
              >
                <UIcon name="i-lucide-martini" class="size-3.5 text-accent-rose" />
                {{ cocktailCount }} {{ cocktailCount === 1 ? 'cocktail' : 'cocktails' }}
              </span>
            </div>

            <div class="animate-rise-in mt-7" style="animation-delay: 160ms">
              <IngredientsPantryToggle full :slug="ingredient.slug" :name="ingredient.name" />
            </div>

            <div v-if="paragraphs.length" class="animate-rise-in mt-8" style="animation-delay: 220ms">
              <div class="relative">
                <div
                  :id="descriptionId"
                  class="space-y-3 text-sm leading-relaxed text-muted sm:text-base"
                  :class="!expanded && isLongDescription && 'max-h-[9rem] overflow-hidden'"
                >
                  <p v-for="(paragraph, index) in paragraphs" :key="index">
                    {{ paragraph }}
                  </p>
                </div>

                <span
                  v-if="!expanded && isLongDescription"
                  aria-hidden="true"
                  class="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--ui-bg)] to-transparent"
                />
              </div>

              <button
                v-if="isLongDescription"
                type="button"
                class="mt-3 inline-flex items-center gap-1.5 rounded-full text-sm font-semibold text-accent transition-colors duration-300 hover:text-accent-rose"
                :aria-expanded="expanded"
                :aria-controls="descriptionId"
                @click="expanded = !expanded"
              >
                {{ expanded ? 'Show less' : 'Read more' }}
                <UIcon
                  name="i-lucide-chevron-down"
                  class="size-4 transition-transform duration-300 ease-lab"
                  :class="expanded && 'rotate-180'"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <RevealOnScroll class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-accent-rose">
            Mixed with it
          </p>
          <h2 class="mt-2 font-display text-3xl font-semibold text-highlighted sm:text-4xl">
            {{ cocktailsHeading }}
          </h2>
          <p class="mt-2 text-sm text-muted">
            {{ cocktails.length }} {{ cocktails.length === 1 ? 'recipe uses' : 'recipes use' }} this ingredient.
          </p>
        </div>
        <UButton
          to="/ingredients"
          variant="outline"
          color="neutral"
          size="lg"
          icon="i-lucide-arrow-left"
          class="rounded-full hover:border-accent/60 hover:text-accent"
        >
          Back to the shelf
        </UButton>
      </RevealOnScroll>

      <EmptyState
        v-if="!cocktails.length"
        class="mt-8"
        icon="i-lucide-glass-water"
        title="No cocktail uses this yet"
        hint="Nothing in the catalogue calls for this ingredient right now. Browse the full list of drinks for something close."
      >
        <UButton
          to="/cocktails"
          color="primary"
          size="lg"
          trailing-icon="i-lucide-arrow-right"
          class="rounded-full px-5 font-semibold"
        >
          Browse cocktails
        </UButton>
      </EmptyState>

      <RevealOnScroll
        v-else
        as="ul"
        :stagger="60"
        class="mt-8 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
      >
        <li v-for="(cocktail, index) in cocktails" :key="cocktail.id">
          <CocktailCard :cocktail="cocktail" :eager="index < 4" />
        </li>
      </RevealOnScroll>

      <IngredientsPantryBar />
    </section>
  </div>
</template>
