<script setup lang="ts">
import type { CatalogStats } from '#shared/types/stats'

const { count } = usePantry()

const { data: catalogStats } = await useAsyncData(
  'catalog-stats',
  () => $fetch<CatalogStats>('/api/stats'),
  { default: () => null }
)

const browseLabel = computed(() => (
  catalogStats.value ? `Browse all ${catalogStats.value.ingredients} ingredients` : 'Browse all ingredients'
))
</script>

<template>
  <GlassPanel strong grain :padded="false" class="relative isolate overflow-visible!">
    <div class="p-5 sm:p-6">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-accent-mint">
            Your shelf
          </p>
          <h2 class="mt-1.5 font-display text-xl font-semibold text-highlighted">
            Tick what you have
          </h2>
        </div>
        <span
          class="flex size-10 shrink-0 items-center justify-center rounded-full border border-default/60 bg-elevated/40"
          aria-hidden="true"
        >
          <UIcon name="i-lucide-refrigerator" class="size-5 text-accent-mint" />
        </span>
      </div>

      <div class="mt-5">
        <PantrySearch />
      </div>

      <div aria-hidden="true" class="rule-gradient my-6 opacity-40" />

      <PantryPacks />

      <div aria-hidden="true" class="rule-gradient my-6 opacity-40" />

      <PantryShelf />

      <p v-if="count > 0" class="mt-5 text-xs text-dimmed">
        Missing something?
        <NuxtLink to="/ingredients" class="font-medium text-accent underline-offset-4 hover:underline">
          {{ browseLabel }}
        </NuxtLink>
      </p>
    </div>
  </GlassPanel>
</template>
