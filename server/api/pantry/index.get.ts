import type { Prisma } from '@prisma/client'
import type { PantryListResponse } from '#shared/types/pantryAccount'

const pantryIngredientSelect = {
  id: true,
  slug: true,
  name: true,
  imageUrl: true,
  isAlcoholic: true,
  abv: true,
  abvEstimated: true,
  groupSlug: true
} satisfies Prisma.IngredientSelect

export default defineEventHandler(async (event): Promise<PantryListResponse> => {
  const user = await requireUser(event)

  const rows = await prisma.pantryItem.findMany({
    where: { userId: user.id },
    orderBy: [{ ingredient: { name: 'asc' } }, { ingredientId: 'asc' }],
    select: { ingredient: { select: pantryIngredientSelect } }
  })

  return { items: rows.map(row => row.ingredient) }
})
