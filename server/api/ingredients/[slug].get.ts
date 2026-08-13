import {
  cocktailCardSelect,
  ingredientCardSelect,
  parseCatalogSlug,
  toCocktailCard,
  toIngredientCard
} from '~~/server/utils/catalogQuery'
import type { CocktailCard, IngredientCard } from '#shared/types/catalog'

export default defineEventHandler(async (event): Promise<IngredientCard & { cocktails: CocktailCard[] }> => {
  const slug = parseCatalogSlug(getRouterParam(event, 'slug'))
  const ingredient = await prisma.ingredient.findUnique({ where: { slug }, select: ingredientCardSelect })

  if (!ingredient) {
    throw createError({ statusCode: 404, statusMessage: 'Ingredient not found' })
  }

  const cocktails = await prisma.cocktail.findMany({
    where: { ingredients: { some: { ingredientId: ingredient.id } } },
    select: cocktailCardSelect,
    orderBy: [{ name: 'asc' }, { id: 'asc' }]
  })

  return {
    ...toIngredientCard(ingredient, cocktails.length),
    cocktails: cocktails.map(toCocktailCard)
  }
})
