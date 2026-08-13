import { SPIRIT_GROUP_SLUGS, toSortedFacets } from '~~/server/utils/catalogQuery'
import type { CatalogMeta } from '#shared/types/catalog'

export default defineEventHandler(async (): Promise<CatalogMeta> => {
  const [categories, glasses, spirits] = await Promise.all([
    prisma.cocktail.groupBy({ by: ['category'], where: { category: { not: null } }, _count: true }),
    prisma.cocktail.groupBy({ by: ['glass'], where: { glass: { not: null } }, _count: true }),
    Promise.all(SPIRIT_GROUP_SLUGS.map(async groupSlug => ({
      value: groupSlug,
      count: await prisma.cocktail.count({ where: { ingredients: { some: { ingredient: { groupSlug } } } } })
    })))
  ])

  return {
    categories: toSortedFacets(categories.map(row => ({ value: row.category, count: row._count }))),
    glasses: toSortedFacets(glasses.map(row => ({ value: row.glass, count: row._count }))),
    spirits
  }
})
