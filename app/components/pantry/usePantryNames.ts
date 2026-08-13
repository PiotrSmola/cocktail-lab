import type { IngredientCard, Paginated } from '#shared/types/catalog'
import { useState } from '#app'

export interface PantryIngredientMeta {
  slug: string
  name: string
  imageUrl: string | null
}

const RESOLVE_PAGES = [1, 2, 3, 4]
const RESOLVE_PER_PAGE = 96

export function humanizeSlug(slug: string): string {
  const parts = slug.split('-').filter(Boolean)
  const head = parts[0]
  if (!head) {
    return slug
  }
  return [head.charAt(0).toUpperCase() + head.slice(1), ...parts.slice(1)].join(' ')
}

export function usePantryNames() {
  const cache = useState<Record<string, PantryIngredientMeta>>('pantry-names', () => ({}))
  const resolved = useState<boolean>('pantry-names-resolved', () => false)
  const resolving = useState<boolean>('pantry-names-resolving', () => false)

  function remember(entries: PantryIngredientMeta[]): void {
    if (entries.length === 0) {
      return
    }
    const next = { ...cache.value }
    for (const entry of entries) {
      next[entry.slug] = entry
    }
    cache.value = next
  }

  function lookup(slug: string): PantryIngredientMeta {
    return cache.value[slug] ?? { slug, name: humanizeSlug(slug), imageUrl: null }
  }

  function isKnown(slug: string): boolean {
    return Boolean(cache.value[slug])
  }

  async function resolveAll(): Promise<void> {
    if (resolved.value || resolving.value) {
      return
    }
    resolving.value = true
    try {
      const pages = await Promise.all(RESOLVE_PAGES.map(page => $fetch<Paginated<IngredientCard>>('/api/ingredients', {
        query: { page, perPage: RESOLVE_PER_PAGE, sort: 'name' },
      }).catch(() => null)))

      const entries = pages
        .flatMap(page => page?.items ?? [])
        .map(item => ({ slug: item.slug, name: item.name, imageUrl: item.imageUrl }))

      if (entries.length > 0) {
        remember(entries)
        resolved.value = true
      }
    }
    finally {
      resolving.value = false
    }
  }

  return { cache, lookup, remember, isKnown, resolveAll, resolving }
}
