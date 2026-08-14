export const GUEST_PANTRY_LIMIT = 80
export const GUEST_FAVORITES_LIMIT = 100
export const PANTRY_MERGE_LIMIT = 300
export const GUEST_COOKIE_BUDGET_BYTES = 3072

export interface CappedAdd<T> {
  values: T[]
  capped: boolean
}

export function capList<T>(values: T[], limit: number): T[] {
  return [...new Set(values)].slice(0, Math.max(0, limit))
}

export function withoutEntry<T>(values: T[], entry: T): T[] {
  return values.filter(value => value !== entry)
}

export function addWithinLimit<T>(values: T[], entry: T, limit: number, prepend = false): CappedAdd<T> {
  const current = [...new Set(values)]

  if (current.includes(entry)) {
    return { values: current, capped: false }
  }

  if (current.length >= limit) {
    return { values: current, capped: true }
  }

  return { values: prepend ? [entry, ...current] : [...current, entry], capped: false }
}

export function buildMergeSlugs(values: string[]): string[] {
  const cleaned = values
    .map(value => value.trim())
    .filter(value => value.length > 0)

  return capList(cleaned, PANTRY_MERGE_LIMIT)
}

export function indexIngredientIds(items: { id: number, slug: string }[]): Record<string, number> {
  const index: Record<string, number> = {}

  for (const item of items) {
    index[item.slug] = item.id
  }

  return index
}

export function encodedCookieBytes(name: string, values: unknown): number {
  const encoded = `${name}=${encodeURIComponent(JSON.stringify(values))}`

  return new TextEncoder().encode(encoded).length
}
