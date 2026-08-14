import { CATALOG_CACHE_MAX_AGE, catalogQueryCacheKey } from '~~/server/utils/catalogCache'
import {
  buildIngredientOrderBy,
  buildIngredientWhere,
  fetchIngredientCocktailCounts,
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
  const counts = await fetchIngredientCocktailCounts()

  if (query.sort === 'popular') {
    const matches = await prisma.ingredient.findMany({
      where,
      select: ingredientCardSelect,
      orderBy: buildIngredientOrderBy('name')
    })
    const items = matches
      .sort((left, right) => (counts.get(right.id) ?? 0) - (counts.get(left.id) ?? 0))
      .slice(skip, skip + take)
      .map(row => toIngredientCard(row, counts.get(row.id) ?? 0))

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
  getKey: event => catalogQueryCacheKey('ingredients', getQuery(event))
})
