import { CATALOG_CACHE_MAX_AGE, catalogSlugCacheKey } from '~~/server/utils/catalogCache'
import { cocktailDetailSelect, parseCatalogSlug, toCocktailDetail } from '~~/server/utils/catalogQuery'
import type { CocktailDetail } from '#shared/types/catalog'

export default defineCachedEventHandler(async (event): Promise<CocktailDetail> => {
  const slug = parseCatalogSlug(getRouterParam(event, 'slug'))
  const cocktail = await prisma.cocktail.findUnique({ where: { slug }, select: cocktailDetailSelect })

  if (!cocktail) {
    throw createError({ statusCode: 404, statusMessage: 'Cocktail not found' })
  }

  return toCocktailDetail(cocktail)
}, {
  name: 'cocktail-detail',
  maxAge: CATALOG_CACHE_MAX_AGE,
  swr: true,
  getKey: event => catalogSlugCacheKey('cocktail', getRouterParam(event, 'slug'))
})
