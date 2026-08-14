<script setup lang="ts">
import type { LocationQueryRaw, RouteLocationRaw } from 'vue-router'
import type { IngredientCard, Paginated } from '#shared/types/catalog'
import type { CatalogStats } from '#shared/types/stats'

const SORT_VALUES = ['popular', 'name', '-name'] as const

type IngredientSort = typeof SORT_VALUES[number]

const DEFAULT_SORT: IngredientSort = 'popular'
const PER_PAGE = 36

const route = useRoute()
const router = useRouter()

function firstValue(value: unknown): string {
  if (Array.isArray(value)) {
    const entry = value[0]
    return typeof entry === 'string' ? entry : ''
  }
  return typeof value === 'string' ? value : ''
}

const activeSearch = computed(() => firstValue(route.query.q).trim())
const activeGroup = computed(() => firstValue(route.query.group))
const activeProof = computed(() => {
  const value = firstValue(route.query.alcoholic)
  return value === 'true' || value === 'false' ? value : ''
})
const activeSort = computed<IngredientSort>(() => {
  const value = firstValue(route.query.sort) as IngredientSort
  return SORT_VALUES.includes(value) ? value : DEFAULT_SORT
})
const activePage = computed(() => {
  const value = Number.parseInt(firstValue(route.query.page), 10)
  return Number.isFinite(value) && value > 1 ? value : 1
})

function buildQuery(patch: Record<string, string>): LocationQueryRaw {
  const merged: Record<string, string> = {
    q: activeSearch.value,
    group: activeGroup.value,
    alcoholic: activeProof.value,
    sort: activeSort.value === DEFAULT_SORT ? '' : activeSort.value,
    page: activePage.value > 1 ? String(activePage.value) : '',
    ...patch
  }

  return Object.fromEntries(Object.entries(merged).filter(([, value]) => value !== ''))
}

function linkTo(patch: Record<string, string>): RouteLocationRaw {
  return { path: '/ingredients', query: buildQuery({ page: '', ...patch }) }
}

function pageLink(page: number): RouteLocationRaw {
  return linkTo({ page: page > 1 ? String(page) : '' })
}

const search = ref(activeSearch.value)

const sortModel = computed<string>({
  get: () => activeSort.value,
  set: (value) => {
    void router.push(linkTo({ sort: value === DEFAULT_SORT ? '' : value }))
  }
})

watchDebounced(search, (value) => {
  const term = value.trim()
  if (term === activeSearch.value) {
    return
  }
  void router.replace({ path: '/ingredients', query: buildQuery({ q: term, page: '' }) })
}, { debounce: 300 })

watch(activeSearch, (value) => {
  if (value !== search.value.trim()) {
    search.value = value
  }
})

const requestQuery = computed(() => ({
  q: activeSearch.value || undefined,
  group: activeGroup.value || undefined,
  alcoholic: activeProof.value || undefined,
  sort: activeSort.value,
  page: activePage.value,
  perPage: PER_PAGE
}))

const { data: catalogStats } = await useAsyncData(
  'catalog-stats',
  () => $fetch<CatalogStats>('/api/stats'),
  { default: () => null }
)

const catalogSize = computed(() => catalogStats.value?.ingredients ?? null)

const { data, status } = await useAsyncData(
  'ingredients-index',
  () => $fetch<Paginated<IngredientCard>>('/api/ingredients', { query: requestQuery.value }),
  { watch: [requestQuery], default: () => null }
)

const items = computed(() => data.value?.items ?? [])
const totalCount = computed(() => data.value?.total ?? 0)
const pageCount = computed(() => data.value?.pages ?? 1)
const pending = computed(() => status.value === 'pending')
const showSkeletons = computed(() => pending.value && items.value.length === 0)
const showEmpty = computed(() => !pending.value && items.value.length === 0)
const skeletonCount = computed(() => Math.min(items.value.length || 12, 12))

const groupLabel = computed(() => (
  activeGroup.value
    ? `${activeGroup.value.charAt(0).toUpperCase()}${activeGroup.value.slice(1)}`
    : ''
))

const filterSummary = computed(() => {
  const parts: string[] = []
  if (activeGroup.value) {
    parts.push(activeGroup.value)
  }
  if (activeProof.value === 'true') {
    parts.push('alcoholic')
  }
  if (activeProof.value === 'false') {
    parts.push('non-alcoholic')
  }
  return parts.join(' · ')
})

const hasFilters = computed(() => Boolean(activeSearch.value || activeGroup.value || activeProof.value))

const countLabel = computed(() => {
  const total = totalCount.value
  const noun = total === 1 ? 'ingredient' : 'ingredients'
  let label = activeSearch.value
    ? `${total} ${noun} matching “${activeSearch.value}”`
    : `${total} ${noun} on the shelf`
  if (filterSummary.value) {
    label += ` · ${filterSummary.value}`
  }
  if (pageCount.value > 1) {
    label += ` · page ${activePage.value} of ${pageCount.value}`
  }
  return label
})

const seoTitle = computed(() => {
  if (activeSearch.value) {
    return `Ingredients matching “${activeSearch.value}”`
  }
  if (activeGroup.value) {
    return `${groupLabel.value} ingredients`
  }
  if (activeProof.value === 'false') {
    return 'Non-alcoholic ingredients'
  }
  return 'Ingredients'
})

const seoDescription = computed(() => {
  if (activeSearch.value) {
    return `Ingredients matching “${activeSearch.value}” in the Cocktail Lab shelf, with ABV, category and every cocktail that uses them.`
  }
  if (activeGroup.value) {
    return `Browse ${groupLabel.value.toLowerCase()} ingredients, see their ABV and the cocktails they unlock, then add them to your pantry.`
  }
  return catalogSize.value === null
    ? 'Browse every ingredient in the Cocktail Lab: spirits, mixers, juices and garnish, each linked to the drinks it unlocks.'
    : `Browse all ${catalogSize.value} ingredients in the Cocktail Lab: spirits, mixers, juices and garnish, each linked to the drinks it unlocks.`
})

useSeoMeta({
  title: () => seoTitle.value,
  description: () => seoDescription.value,
  ogTitle: () => seoTitle.value,
  ogDescription: () => seoDescription.value
})
</script>

<template>
  <div>
    <PageHero eyebrow="The shelf" title="Every bottle, mixer and garnish">
      <template #description>
        <p v-if="catalogSize !== null">
          <AnimatedNumber :key="catalogSize" :value="catalogSize" /> ingredients, each one traced back to the
          drinks it unlocks. Tick what is already on your shelf while you browse and the pantry matcher does
          the rest.
        </p>
        <p v-else>
          Every ingredient on the shelf, traced back to the drinks it unlocks. Tick what is already on your
          shelf while you browse and the pantry matcher does the rest.
        </p>
      </template>

      <template #actions>
        <UButton
          to="/pantry"
          size="lg"
          color="primary"
          trailing-icon="i-lucide-arrow-right"
          class="rounded-full px-5 font-semibold glow-amber"
        >
          Open the pantry matcher
        </UButton>
        <UButton
          to="/cocktails"
          size="lg"
          variant="ghost"
          color="neutral"
          class="rounded-full border border-default/70 px-5 hover:border-accent-rose/60 hover:text-accent-rose"
        >
          Browse cocktails
        </UButton>
      </template>
    </PageHero>

    <section class="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <IngredientsFilters
        v-model:q="search"
        v-model:sort="sortModel"
        :group="activeGroup"
        :alcoholic="activeProof"
        :link="linkTo"
      />

      <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-muted" aria-live="polite">
          {{ countLabel }}
        </p>
        <NuxtLink
          v-if="hasFilters"
          to="/ingredients"
          class="inline-flex items-center gap-1.5 text-sm font-medium text-dimmed transition-colors duration-300 hover:text-accent-rose"
        >
          <UIcon name="i-lucide-rotate-ccw" class="size-3.5" />
          Reset filters
        </NuxtLink>
      </div>

      <div
        v-if="showSkeletons"
        class="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
      >
        <IngredientsCardSkeleton v-for="n in skeletonCount" :key="n" :delay="n * 70" />
      </div>

      <EmptyState
        v-else-if="showEmpty"
        class="mt-6"
        icon="i-lucide-flask-conical-off"
        title="Nothing on this part of the shelf"
        hint="No ingredient matches that combination yet. Loosen the filters or try a shorter search term."
      >
        <UButton
          to="/ingredients"
          color="primary"
          size="lg"
          icon="i-lucide-rotate-ccw"
          class="rounded-full px-5 font-semibold"
        >
          Clear filters
        </UButton>
      </EmptyState>

      <RevealOnScroll
        v-else
        as="ul"
        :stagger="55"
        class="mt-6 grid gap-4 transition-opacity duration-300 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
        :class="pending && 'opacity-60'"
        :aria-busy="pending"
      >
        <TransitionGroup name="tile">
          <li v-for="(ingredient, index) in items" :key="ingredient.slug">
            <IngredientsCard :ingredient="ingredient" :eager="index < 8" />
          </li>
        </TransitionGroup>
      </RevealOnScroll>

      <div v-if="pageCount > 1" class="mt-10 flex justify-center">
        <UPagination
          :page="activePage"
          :total="totalCount"
          :items-per-page="PER_PAGE"
          :sibling-count="1"
          :to="pageLink"
          size="lg"
        />
      </div>

      <IngredientsPantryBar />
    </section>
  </div>
</template>

<style scoped>
.tile-move {
  transition: transform 0.5s var(--ease-lab);
}

.tile-enter-active,
.tile-leave-active {
  transition:
    opacity 0.35s var(--ease-lab),
    transform 0.35s var(--ease-lab);
}

.tile-enter-from,
.tile-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.97);
}
</style>
