export interface CatalogStats {
  cocktails: number
  ingredients: number
  pairings: number
  alcoholicCocktails: number
  zeroProofCocktails: number
  ibaCocktails: number
  avgIngredientsPerCocktail: number
  sourceUpdatedAt: string | null
}

export interface CatalogStatsInput {
  cocktails: number
  ingredients: number
  pairings: number
  alcoholicCocktails: number
  ibaCocktails: number
  sourceModifiedAt: Date | string | null
}

function toWholeCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

function toIsoDate(value: Date | string | null): string | null {
  if (value === null) {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)

  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function buildCatalogStats(input: CatalogStatsInput): CatalogStats {
  const cocktails = toWholeCount(input.cocktails)
  const pairings = toWholeCount(input.pairings)
  const alcoholicCocktails = Math.min(toWholeCount(input.alcoholicCocktails), cocktails)

  return {
    cocktails,
    ingredients: toWholeCount(input.ingredients),
    pairings,
    alcoholicCocktails,
    zeroProofCocktails: cocktails - alcoholicCocktails,
    ibaCocktails: Math.min(toWholeCount(input.ibaCocktails), cocktails),
    avgIngredientsPerCocktail: cocktails === 0 ? 0 : Math.round((pairings / cocktails) * 10) / 10,
    sourceUpdatedAt: toIsoDate(input.sourceModifiedAt)
  }
}
