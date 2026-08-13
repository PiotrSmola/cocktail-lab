<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

defineProps<{
  group: string
  alcoholic: string
  link: (patch: Record<string, string>) => RouteLocationRaw
}>()

const search = defineModel<string>('q', { required: true })
const sort = defineModel<string>('sort', { required: true })

const groups = [
  { slug: '', label: 'All', icon: 'i-lucide-layout-grid' },
  { slug: 'gin', label: 'Gin', icon: 'i-lucide-leaf' },
  { slug: 'rum', label: 'Rum', icon: 'i-lucide-ship' },
  { slug: 'vodka', label: 'Vodka', icon: 'i-lucide-test-tube' },
  { slug: 'tequila', label: 'Tequila', icon: 'i-lucide-flame' },
  { slug: 'whiskey', label: 'Whiskey', icon: 'i-lucide-wheat' },
  { slug: 'brandy', label: 'Brandy', icon: 'i-lucide-grape' },
  { slug: 'vermouth', label: 'Vermouth', icon: 'i-lucide-flower-2' },
  { slug: 'bitters', label: 'Bitters', icon: 'i-lucide-flask-round' },
  { slug: 'citrus', label: 'Citrus', icon: 'i-lucide-citrus' },
  { slug: 'juice', label: 'Juice', icon: 'i-lucide-glass-water' },
  { slug: 'syrup', label: 'Syrup', icon: 'i-lucide-droplet' },
  { slug: 'soda', label: 'Soda', icon: 'i-lucide-cup-soda' },
  { slug: 'dairy', label: 'Dairy', icon: 'i-lucide-milk' },
  { slug: 'ice', label: 'Ice', icon: 'i-lucide-snowflake' }
]

const proofOptions = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Alcoholic' },
  { value: 'false', label: 'Non-alcoholic' }
]

const sortOptions = [
  { value: 'popular', label: 'Most used' },
  { value: 'name', label: 'A–Z' },
  { value: '-name', label: 'Z–A' }
]
</script>

<template>
  <GlassPanel :padded="false" class="p-4 sm:p-5">
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          size="lg"
          type="search"
          placeholder="Search ingredients — gin, lime, orgeat…"
          aria-label="Search ingredients by name"
          autocomplete="off"
          class="flex-1"
          :ui="{ root: 'w-full' }"
        >
          <template v-if="search" #trailing>
            <UButton
              color="neutral"
              variant="link"
              size="sm"
              icon="i-lucide-x"
              aria-label="Clear search"
              @click="search = ''"
            />
          </template>
        </UInput>

        <div class="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Filter by alcohol content"
            class="flex items-center gap-1 rounded-full border border-default/70 bg-elevated/30 p-1"
          >
            <NuxtLink
              v-for="option in proofOptions"
              :key="option.label"
              :to="link({ alcoholic: option.value })"
              :aria-current="alcoholic === option.value ? 'page' : undefined"
              class="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-300 ease-lab sm:text-sm"
              :class="alcoholic === option.value
                ? 'bg-lab-amber/20 text-accent'
                : 'text-muted hover:text-highlighted'"
            >
              {{ option.label }}
            </NuxtLink>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-dimmed">Sort</span>
            <USelect
              v-model="sort"
              :items="sortOptions"
              size="lg"
              aria-label="Sort ingredients"
              class="w-40"
            />
          </div>
        </div>
      </div>

      <div class="-mx-4 px-4 sm:-mx-5 sm:px-5">
        <ul class="no-scrollbar edge-fade-x flex items-center gap-2 overflow-x-auto pb-1">
          <li v-for="entry in groups" :key="entry.label" class="shrink-0">
            <NuxtLink
              :to="link({ group: entry.slug })"
              :aria-current="group === entry.slug ? 'page' : undefined"
              class="flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-[background-color,border-color,color] duration-300 ease-lab"
              :class="group === entry.slug
                ? 'border-lab-amber/55 bg-lab-amber/15 text-accent'
                : 'border-default/70 bg-elevated/30 text-muted hover:border-lab-amber/40 hover:text-highlighted'"
            >
              <UIcon :name="entry.icon" class="size-3.5 shrink-0" />
              {{ entry.label }}
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>
  </GlassPanel>
</template>

<style scoped>
:deep(input[type='search']::-webkit-search-cancel-button) {
  display: none;
}
</style>
