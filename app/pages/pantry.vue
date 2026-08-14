<script setup lang="ts">
import type { PantryMatchResult } from '#shared/types/pantry'

useSeoMeta({
  title: 'Pantry — what can you make?',
  description: 'Tick the bottles, mixers and citrus already on your shelf and Cocktail Lab shows every drink you can shake right now, the ones you are one ingredient away from, and the single bottle that unlocks the most new rounds.',
  ogTitle: 'Pantry — what can you make?',
  ogDescription: 'Match your home bar against 441 cocktails: what you can pour tonight, what you are one ingredient away from, and the best bottle to buy next.'
})

const { slugs, count } = usePantry()
const requestFetch = useRequestFetch()

// Match runs client-side only: it depends on cookie/session state anyway,
// and the POST is the heaviest endpoint in the app, so it must never
// block SSR. Account pantry hydrates itself client-side (see usePantry)
// and the debounced watcher below re-runs the match once slugs arrive.
const { data: match, status, error, refresh } = useAsyncData<PantryMatchResult | null>(
  'pantry-match',
  () => (slugs.value.length > 0
    ? requestFetch<PantryMatchResult>('/api/pantry/match', {
        method: 'POST',
        body: { ingredients: slugs.value }
      })
    : Promise.resolve(null)),
  { default: () => null, lazy: true, server: false }
)

const pending = computed(() => status.value === 'pending')
const debouncedSlugs = refDebounced(slugs, 300)

watch(debouncedSlugs, () => {
  void refresh()
})
</script>

<template>
  <div>
    <PageHero eyebrow="Mixology math" title="What can you shake tonight?">
      <template #description>
        Tick the bottles, mixers and citrus already on your shelf. Cocktail Lab matches them against
        every recipe in the lab and tells you what to pour, what you are one ingredient away from, and
        which single bottle would unlock the most.
      </template>
    </PageHero>

    <section class="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <div class="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <div class="lg:sticky lg:top-20 lg:w-96 lg:shrink-0">
          <PantryPicker />
        </div>

        <div class="min-w-0 flex-1">
          <PantryResults
            :result="match"
            :pending="pending"
            :pantry-count="count"
            :failed="Boolean(error)"
            @retry="refresh"
          />
        </div>
      </div>
    </section>
  </div>
</template>
