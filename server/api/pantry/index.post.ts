import { z } from 'zod'
import type { PantryMutationResponse } from '#shared/types/pantryAccount'

const bodySchema = z.object({
  ingredientId: z.number().int().positive()
})

export default defineEventHandler(async (event): Promise<PantryMutationResponse> => {
  const user = await requireUser(event)

  const { ingredientId } = await readValidatedBody(event, bodySchema.parse)

  const ingredient = await prisma.ingredient.findUnique({
    where: { id: ingredientId },
    select: { id: true }
  })

  if (!ingredient) {
    throw createError({ statusCode: 404, statusMessage: 'Ingredient not found' })
  }

  await prisma.pantryItem.upsert({
    where: { userId_ingredientId: { userId: user.id, ingredientId } },
    create: { userId: user.id, ingredientId },
    update: {}
  })

  return { ok: true }
})
