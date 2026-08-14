import { CATALOG_CACHE_MAX_AGE, catalogQueryCacheKey } from '~~/server/utils/catalogCache'
import {
  buildIngredientOrderBy,
  buildIngredientWhere,
  fetchIngredientCocktailCounts,
  fetchPopularIngredientPage,
  ingredientCardSelect,
  paginateCatalog,
  paginationRange,
  parseIngredientListQuery,
  toIngredientCard
} from '~~/server/utils/catalogQuery'
import type { IngredientCard, Paginated } from '#shared/types/catalog'

export default defineCachedEventHandler(async (event): Promise<Paginated<IngredientCard>> => {
  const query = await getValidatedQuery(event, input => parseIngredientListQuery(input))
  const where = buildIngredientWhere(query)
  const { skip, take } = paginationRange(query.page, query.perPage)

  if (query.sort === 'popular') {
    const matches = await prisma.ingredient.findMany({ where, select: { id: true } })
    const pageEntries = await fetchPopularIngredientPage(matches.map(match => match.id), skip, take)
    const rows = await prisma.ingredient.findMany({
      where: { id: { in: pageEntries.map(entry => entry.id) } },
      select: ingredientCardSelect
    })
    const rowsById = new Map(rows.map(row => [row.id, row]))
    const items = pageEntries.flatMap((entry) => {
      const row = rowsById.get(entry.id)

      return row ? [toIngredientCard(row, entry.cocktailCount)] : []
    })

    return paginateCatalog(items, matches.length, query.page, query.perPage)
  }

  const [total, rows] = await Promise.all([
    prisma.ingredient.count({ where }),
    prisma.ingredient.findMany({
      where,
      select: ingredientCardSelect,
      orderBy: buildIngredientOrderBy(query.sort),
      skip,
      take
    })
  ])
  const counts = await fetchIngredientCocktailCounts(rows.map(row => row.id))

  return paginateCatalog(
    rows.map(row => toIngredientCard(row, counts.get(row.id) ?? 0)),
    total,
    query.page,
    query.perPage
  )
}, {
  name: 'ingredients-list',
  maxAge: CATALOG_CACHE_MAX_AGE,
  swr: true,
  getKey: event => catalogQueryCacheKey('ingredients', parseIngredientListQuery(getQuery(event)))
})
