import { CATALOG_CACHE_MAX_AGE } from '~~/server/utils/catalogCache'
import { buildCatalogStats } from '#shared/types/stats'
import type { CatalogStats } from '#shared/types/stats'

const readCatalogStats = defineCachedFunction(async (): Promise<CatalogStats> => {
  const [cocktails, ingredients, pairings, byProof, ibaCocktails, source] = await Promise.all([
    prisma.cocktail.count(),
    prisma.ingredient.count(),
    prisma.cocktailIngredient.count(),
    prisma.cocktail.groupBy({ by: ['isAlcoholic'], _count: { _all: true } }),
    prisma.cocktail.count({ where: { iba: { not: null } } }),
    prisma.cocktail.aggregate({ _max: { sourceModifiedAt: true } })
  ])

  return buildCatalogStats({
    cocktails,
    ingredients,
    pairings,
    alcoholicCocktails: byProof.find(row => row.isAlcoholic)?._count._all ?? 0,
    ibaCocktails,
    sourceModifiedAt: source._max.sourceModifiedAt
  })
}, {
  name: 'catalog-stats',
  maxAge: CATALOG_CACHE_MAX_AGE,
  swr: true,
  getKey: () => 'catalog-stats'
})

export default defineEventHandler(async (event): Promise<CatalogStats> => {
  setResponseHeader(event, 'cache-control', `public, s-maxage=${CATALOG_CACHE_MAX_AGE}, stale-while-revalidate=60`)

  return readCatalogStats()
})
