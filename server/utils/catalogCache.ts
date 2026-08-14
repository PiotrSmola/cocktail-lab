export const CATALOG_CACHE_MAX_AGE = 3600

function encodeCacheSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, character => `_${character.charCodeAt(0).toString(16)}_`)
}

function stringifyCacheValue(value: unknown): string {
  return Array.isArray(value) ? value.map(entry => String(entry)).join(',') : String(value)
}

export function catalogQueryCacheKey(prefix: string, query: Record<string, unknown>): string {
  const canonical = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${stringifyCacheValue(value)}`)
    .sort()
    .join('&')

  return canonical.length === 0 ? prefix : `${prefix}_${encodeCacheSegment(canonical)}`
}

export function catalogSlugCacheKey(prefix: string, slug: string | undefined): string {
  return `${prefix}_${encodeCacheSegment(slug ?? '')}`
}

export function isRandomSortQuery(query: Record<string, unknown>): boolean {
  const sort = query.sort

  return Array.isArray(sort) ? sort.includes('random') : sort === 'random'
}
