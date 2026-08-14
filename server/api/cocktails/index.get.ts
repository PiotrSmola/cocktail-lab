import { CATALOG_CACHE_MAX_AGE, catalogQueryCacheKey } from '~~/server/utils/catalogCache'
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
import type { CocktailListQuery } from '~~/server/utils/catalogQuery'
import type { CocktailCard, Paginated } from '#shared/types/catalog'

const listCocktails = defineCachedFunction(async (query: CocktailListQuery): Promise<Paginated<CocktailCard>> => {
  const where = buildCocktailWhere(query)
  const { skip, take } = paginationRange(query.page, query.perPage)

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
  getKey: (query: CocktailListQuery) => catalogQueryCacheKey('cocktails', query)
})

export default defineEventHandler(async (event): Promise<Paginated<CocktailCard>> => {
  const query = await getValidatedQuery(event, input => parseCocktailListQuery(input))

  if (query.sort === 'random') {
    const where = buildCocktailWhere(query)
    const { skip, take } = paginationRange(query.page, query.perPage)
    const matches = await prisma.cocktail.findMany({ where, select: { id: true } })
    const pageIds = shuffleIds(matches.map(match => match.id)).slice(skip, skip + take)
    const rows = await prisma.cocktail.findMany({ where: { id: { in: pageIds } }, select: cocktailCardSelect })
    const cardsById = new Map(rows.map(row => [row.id, toCocktailCard(row)]))
    const items = pageIds.map(id => cardsById.get(id)).filter(card => card !== undefined)

    setResponseHeader(event, 'cache-control', 'no-store')

    return paginateCatalog(items, matches.length, query.page, query.perPage)
  }

  setResponseHeader(event, 'cache-control', `public, s-maxage=${CATALOG_CACHE_MAX_AGE}, stale-while-revalidate=60`)

  return listCocktails(query)
})
