import { CATALOG_CACHE_MAX_AGE } from '~~/server/utils/catalogCache'
import { SPIRIT_GROUP_SLUGS, toSortedFacets } from '~~/server/utils/catalogQuery'
import { STRENGTH_BANDS } from '#shared/types/catalog'
import type { CatalogMeta } from '#shared/types/catalog'

export default defineCachedEventHandler(async (): Promise<CatalogMeta> => {
  const [categories, glasses, spirits, strengths] = await Promise.all([
    prisma.cocktail.groupBy({ by: ['category'], where: { category: { not: null } }, _count: true }),
    prisma.cocktail.groupBy({ by: ['glass'], where: { glass: { not: null } }, _count: true }),
    Promise.all(SPIRIT_GROUP_SLUGS.map(async groupSlug => ({
      value: groupSlug,
      count: await prisma.cocktail.count({ where: { ingredients: { some: { ingredient: { groupSlug } } } } })
    }))),
    Promise.all(STRENGTH_BANDS.map(async band => ({
      value: band.value,
      count: await prisma.cocktail.count({ where: { abv: band.range } })
    })))
  ])

  return {
    categories: toSortedFacets(categories.map(row => ({ value: row.category, count: row._count }))),
    glasses: toSortedFacets(glasses.map(row => ({ value: row.glass, count: row._count }))),
    spirits,
    strengths
  }
}, {
  name: 'cocktails-meta',
  maxAge: CATALOG_CACHE_MAX_AGE,
  swr: true,
  getKey: () => 'catalog-meta'
})
