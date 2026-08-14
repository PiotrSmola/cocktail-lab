<script setup lang="ts">
import { STRENGTH_BAND_VALUES, strengthValueLabel } from '#shared/types/catalog'
import type { CatalogMeta, CocktailCard as CocktailCardDto, Paginated } from '#shared/types/catalog'

const PER_PAGE = 24
const SPIRITS = ['rum', 'gin', 'vodka', 'tequila', 'whiskey', 'brandy'] as const
const SORTS = ['name', '-name', 'recent', 'random', 'strength', '-strength'] as const
const QUERY_KEYS = ['q', 'spirit', 'alcoholic', 'category', 'glass', 'strength', 'sort', 'page'] as const

type QueryKey = typeof QUERY_KEYS[number]
type SortValue = typeof SORTS[number]

const route = useRoute()
const router = useRouter()
const reducedMotion = usePreferredReducedMotion()
const { isFavorite, toggle } = useFavorites()

function firstValue(input: unknown): string {
  if (Array.isArray(input)) {
    return firstValue(input[0])
  }
  return typeof input === 'string' ? input.trim() : ''
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const filters = computed(() => {
  const spirit = firstValue(route.query.spirit).toLowerCase()
  const alcoholic = firstValue(route.query.alcoholic).toLowerCase()
  const strength = firstValue(route.query.strength).toLowerCase()
  const sort = firstValue(route.query.sort)
  const page = Number.parseInt(firstValue(route.query.page), 10)

  return {
    q: firstValue(route.query.q),
    spirit: (SPIRITS as readonly string[]).includes(spirit) ? spirit : '',
    alcoholic: alcoholic === 'true' || alcoholic === 'false' ? alcoholic : '',
    category: firstValue(route.query.category),
    glass: firstValue(route.query.glass),
    strength: (STRENGTH_BAND_VALUES as readonly string[]).includes(strength) ? strength : '',
    sort: ((SORTS as readonly string[]).includes(sort) ? sort : 'name') as SortValue,
    page: Number.isFinite(page) && page > 1 ? page : 1
  }
})

const apiQuery = computed(() => {
  const value = filters.value
  const query: Record<string, string | number> = { sort: value.sort, page: value.page, perPage: PER_PAGE }

  if (value.q) query.q = value.q
  if (value.spirit) query.spirit = value.spirit
  if (value.alcoholic) query.alcoholic = value.alcoholic
  if (value.category) query.category = value.category
  if (value.glass) query.glass = value.glass
  if (value.strength) query.strength = value.strength

  return query
})

const { data: result, status } = useAsyncData(
  'cocktails-index',
  () => $fetch<Paginated<CocktailCardDto>>('/api/cocktails', { query: apiQuery.value }),
  { watch: [apiQuery], lazy: true, default: () => null }
)

const { data: meta, status: metaStatus } = useAsyncData(
  'cocktails-meta',
  () => $fetch<CatalogMeta>('/api/cocktails/meta'),
  { default: () => null }
)

const items = computed(() => result.value?.items ?? [])
const total = computed(() => result.value?.total ?? 0)
const pageCount = computed(() => result.value?.pages ?? 0)
const pending = computed(() => status.value === 'pending')
const showSkeletons = computed(() => pending.value && items.value.length === 0)
const showEmpty = computed(() => !pending.value && items.value.length === 0)

const rangeStart = computed(() => (total.value === 0 ? 0 : (filters.value.page - 1) * PER_PAGE + 1))
const rangeEnd = computed(() => Math.min(filters.value.page * PER_PAGE, total.value))

const countLabel = computed(() => {
  if (pending.value && total.value === 0) return 'Pouring results…'
  if (total.value === 0) return 'No cocktails found'
  return `Showing ${rangeStart.value}–${rangeEnd.value} of ${total.value} cocktails`
})

const hasFilters = computed(() => {
  const value = filters.value
  return Boolean(value.q || value.spirit || value.alcoholic || value.category || value.glass || value.strength)
})

const chips = computed(() => {
  const value = filters.value
  const list: { key: QueryKey, label: string }[] = []

  if (value.q) list.push({ key: 'q', label: `“${value.q}”` })
  if (value.spirit) list.push({ key: 'spirit', label: capitalize(value.spirit) })
  if (value.alcoholic) list.push({ key: 'alcoholic', label: value.alcoholic === 'true' ? 'Alcoholic' : 'Zero proof' })
  if (value.category) list.push({ key: 'category', label: value.category })
  if (value.glass) list.push({ key: 'glass', label: value.glass })
  if (value.strength) list.push({ key: 'strength', label: strengthValueLabel(value.strength) })

  return list
})

function filterTarget(patch: Partial<Record<QueryKey, string>>): { path: string, query: Record<string, string> } {
  const value = filters.value
  const next: Record<QueryKey, string> = {
    q: value.q,
    spirit: value.spirit,
    alcoholic: value.alcoholic,
    category: value.category,
    glass: value.glass,
    strength: value.strength,
    sort: value.sort,
    page: '1',
    ...patch
  }

  const query: Record<string, string> = {}
  for (const key of QUERY_KEYS) {
    const entry = next[key]
    if (!entry) continue
    if (key === 'sort' && entry === 'name') continue
    if (key === 'page' && entry === '1') continue
    query[key] = entry
  }

  return { path: '/cocktails', query }
}

function strengthTarget(value: string): { path: string, query: Record<string, string> } {
  return filterTarget({ strength: filters.value.strength === value ? '' : value })
}

function applyFilters(
  patch: Partial<Record<QueryKey, string>>,
  options: { replace?: boolean } = {}
): Promise<unknown> {
  const target = filterTarget(patch)
  return options.replace ? router.replace(target) : router.push(target)
}

function clearAll(): void {
  void router.push({ path: '/cocktails', query: {} })
}

const searchTerm = ref(filters.value.q)

watch(() => filters.value.q, (value) => {
  if (value !== searchTerm.value.trim()) {
    searchTerm.value = value
  }
})

const commitSearch = useDebounceFn((value: string) => {
  const next = value.trim()
  if (next === filters.value.q) return
  void applyFilters({ q: next }, { replace: true })
}, 300)

watch(searchTerm, (value) => {
  void commitSearch(value)
})

const spiritModel = computed({
  get: () => filters.value.spirit,
  set: (value: string) => {
    void applyFilters({ spirit: value })
  }
})

const categoryModel = computed({
  get: () => filters.value.category,
  set: (value: string) => {
    void applyFilters({ category: value })
  }
})

const glassModel = computed({
  get: () => filters.value.glass,
  set: (value: string) => {
    void applyFilters({ glass: value })
  }
})

const alcoholicModel = computed({
  get: () => filters.value.alcoholic,
  set: (value: string) => {
    void applyFilters({ alcoholic: value })
  }
})

const sortModel = computed({
  get: () => filters.value.sort as string,
  set: (value: string) => {
    void applyFilters({ sort: value })
  }
})

const resultsAnchor = ref<HTMLElement | null>(null)

async function goToPage(value: number): Promise<void> {
  await applyFilters({ page: String(value) })
  resultsAnchor.value?.scrollIntoView({
    behavior: reducedMotion.value === 'reduce' ? 'auto' : 'smooth',
    block: 'start'
  })
}

function removeChip(key: string): void {
  if (!(QUERY_KEYS as readonly string[]).includes(key)) return

  const patch: Partial<Record<QueryKey, string>> = {}
  patch[key as QueryKey] = ''
  void applyFilters(patch)
}

function onToggleFavorite(id: number): void {
  void toggle(id)
}

const searchPlaceholder = computed(() =>
  total.value > 0 ? `Search ${total.value} cocktails…` : 'Search cocktails by name…'
)

const heroLead = computed(() => (hasFilters.value
  ? 'recipes match the current mix of filters. Tune the shelf below, or clear everything to see the whole index.'
  : 'recipes on the shelf, from IBA classics to zero-proof coolers. Search by name, narrow by base spirit, glass or category, and keep the ones you like.'))

const seoTitle = computed(() => {
  const value = filters.value
  const suffix = value.page > 1 ? ` — page ${value.page}` : ''

  if (value.q) return `Search "${value.q}" in cocktails${suffix}`
  if (value.spirit) return `${capitalize(value.spirit)} cocktails${suffix}`
  if (value.strength) return `${strengthValueLabel(value.strength)} cocktails${suffix}`
  if (value.category) return `${value.category} cocktails${suffix}`
  if (value.glass) return `Cocktails served in a ${value.glass}${suffix}`
  if (value.alcoholic === 'false') return `Zero proof cocktails${suffix}`
  if (value.alcoholic === 'true') return `Alcoholic cocktails${suffix}`

  return `All cocktails${suffix}`
})

const seoDescription = computed(() => {
  const value = filters.value

  if (value.q) return `Cocktail recipes matching "${value.q}" — browse the Cocktail Lab index with filters for base spirit, glass, category and strength.`
  if (value.spirit) return `Every ${value.spirit} cocktail in the Cocktail Lab index, with ingredients, glassware and instructions for each recipe.`
  if (value.strength) return `${strengthValueLabel(value.strength)} cocktails from the Cocktail Lab index, ranked by estimated ABV with ingredients and instructions for each recipe.`
  if (value.alcoholic === 'false') return 'Zero proof cocktails and mocktails from the Cocktail Lab index — all the ritual, none of the alcohol.'

  return 'Browse the full Cocktail Lab index: search by name, filter by base spirit, glass, category or strength, and save the drinks you want to make.'
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
    <PageHero eyebrow="The index" title="Every drink on the shelf">
      <template #description>
        <p>
          <AnimatedNumber
            :key="total"
            :value="total"
            class="font-display text-2xl font-semibold text-accent"
          />
          {{ heroLead }}
        </p>
      </template>
    </PageHero>

    <section class="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <h2 class="sr-only">
        Search and filters
      </h2>

      <RevealOnScroll :stagger="90" class="space-y-5">
        <CocktailsSearchField
          v-model="searchTerm"
          :placeholder="searchPlaceholder"
          label="Search cocktails by name"
        />

        <CocktailsSpiritPills
          :spirits="meta?.spirits ?? []"
          :active="filters.spirit"
          @select="spiritModel = $event"
        />

        <CocktailsStrengthPills
          :bands="meta?.strengths ?? []"
          :active="filters.strength"
          :to="strengthTarget"
        />

        <CocktailsFilterBar
          v-model:category="categoryModel"
          v-model:glass="glassModel"
          v-model:alcoholic="alcoholicModel"
          v-model:sort="sortModel"
          :categories="meta?.categories ?? []"
          :glasses="meta?.glasses ?? []"
          :loading="metaStatus === 'pending'"
        />

        <CocktailsActiveFilters
          v-if="hasFilters"
          :chips="chips"
          @remove="removeChip"
          @clear="clearAll"
        />
      </RevealOnScroll>

      <div ref="resultsAnchor" class="scroll-mt-28" />

      <div class="mt-10 flex flex-wrap items-baseline justify-between gap-3 border-t border-default/50 pt-6">
        <h2 class="sr-only">
          Results
        </h2>
        <p aria-live="polite" class="text-sm text-muted">
          {{ countLabel }}
        </p>
        <p v-if="pageCount > 1" class="text-xs uppercase tracking-[0.16em] text-dimmed">
          Page {{ filters.page }} of {{ pageCount }}
        </p>
      </div>

      <div
        v-if="showSkeletons"
        class="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <CocktailCardSkeleton v-for="n in 12" :key="n" :delay="n * 70" />
      </div>

      <EmptyState
        v-else-if="showEmpty"
        class="mt-6"
        icon="i-lucide-search-x"
        title="No cocktails match this shelf"
        hint="Nothing came back for the current filters. Try another base spirit, widen the glass or category, or clear everything and start the search again."
      >
        <UButton
          color="primary"
          size="lg"
          class="rounded-full px-6 font-semibold glow-amber"
          icon="i-lucide-rotate-ccw"
          @click="clearAll"
        >
          Clear all filters
        </UButton>
      </EmptyState>

      <CocktailsResultsGrid
        v-else
        class="mt-6"
        :items="items"
        :busy="pending"
      >
        <template #actions="{ cocktail }">
          <CocktailsFavoriteButton
            :active="isFavorite(cocktail.id)"
            :name="cocktail.name"
            @toggle="onToggleFavorite(cocktail.id)"
          />
        </template>
      </CocktailsResultsGrid>

      <div v-if="pageCount > 1" class="mt-12 flex justify-center">
        <UPagination
          :page="filters.page"
          :items-per-page="PER_PAGE"
          :total="total"
          :sibling-count="1"
          color="neutral"
          variant="ghost"
          active-variant="soft"
          size="lg"
          :ui="{ list: 'gap-1' }"
          @update:page="goToPage"
        />
      </div>
    </section>
  </div>
</template>
