import { z } from 'zod'
import type { PantryMutationResponse } from '#shared/types/pantryAccount'

const paramsSchema = z.object({
  ingredientId: z.coerce.number().int().positive()
})

export default defineEventHandler(async (event): Promise<PantryMutationResponse> => {
  const user = await requireUser(event)

  const { ingredientId } = await getValidatedRouterParams(event, paramsSchema.parse)

  await prisma.pantryItem.deleteMany({
    where: { userId: user.id, ingredientId }
  })

  return { ok: true }
})
