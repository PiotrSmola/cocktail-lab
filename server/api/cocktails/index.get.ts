import {
  CATALOG_CACHE_MAX_AGE,
  catalogQueryCacheKey,
  isRandomSortQuery
} from '~~/server/utils/catalogCache'
import {
  buildCocktailOrderBy,
  buildCocktailWhere,
  cocktailCardSelect,
  paginateCatalog,
  paginationRange,
  parseCocktailListQuery,
  shuffleIds,
  toCocktailCard
} from '~~/server/utils/catalogQuery'
import type { CocktailCard, Paginated } from '#shared/types/catalog'

export default defineCachedEventHandler(async (event): Promise<Paginated<CocktailCard>> => {
  const query = await getValidatedQuery(event, input => parseCocktailListQuery(input))
  const where = buildCocktailWhere(query)
  const { skip, take } = paginationRange(query.page, query.perPage)

  if (query.sort === 'random') {
    const matches = await prisma.cocktail.findMany({ where, select: { id: true } })
    const pageIds = shuffleIds(matches.map(match => match.id)).slice(skip, skip + take)
    const rows = await prisma.cocktail.findMany({ where: { id: { in: pageIds } }, select: cocktailCardSelect })
    const cardsById = new Map(rows.map(row => [row.id, toCocktailCard(row)]))
    const items = pageIds.map(id => cardsById.get(id)).filter(card => card !== undefined)

    return paginateCatalog(items, matches.length, query.page, query.perPage)
  }

  const [total, rows] = await Promise.all([
    prisma.cocktail.count({ where }),
    prisma.cocktail.findMany({
      where,
      select: cocktailCardSelect,
      orderBy: buildCocktailOrderBy(query.sort),
      skip,
      take
    })
  ])

  return paginateCatalog(rows.map(toCocktailCard), total, query.page, query.perPage)
}, {
  name: 'cocktails-list',
  maxAge: CATALOG_CACHE_MAX_AGE,
  swr: true,
  getKey: event => catalogQueryCacheKey('cocktails', getQuery(event)),
  shouldBypassCache: event => isRandomSortQuery(getQuery(event))
})
