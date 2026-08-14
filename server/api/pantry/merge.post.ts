import { z } from 'zod'
import type { PantryMergeResponse } from '#shared/types/pantryAccount'

const bodySchema = z.object({
  slugs: z.array(z.string().trim().min(1).max(120)).max(300)
})

export default defineEventHandler(async (event): Promise<PantryMergeResponse> => {
  const user = await requireUser(event)

  const { slugs } = await readValidatedBody(event, bodySchema.parse)

  const uniqueSlugs = [...new Set(slugs)]

  if (uniqueSlugs.length === 0) {
    return { merged: 0 }
  }

  const existing = await prisma.ingredient.findMany({
    where: { slug: { in: uniqueSlugs } },
    select: { id: true }
  })

  if (existing.length === 0) {
    return { merged: 0 }
  }

  await prisma.pantryItem.createMany({
    data: existing.map(ingredient => ({ userId: user.id, ingredientId: ingredient.id })),
    skipDuplicates: true
  })

  return { merged: existing.length }
})
