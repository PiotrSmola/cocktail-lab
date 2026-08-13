import { z } from 'zod'

const bodySchema = z.object({
  cocktailIds: z.array(z.number().int().positive()).max(500)
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const { cocktailIds } = await readValidatedBody(event, bodySchema.parse)

  const uniqueIds = [...new Set(cocktailIds)]

  if (uniqueIds.length === 0) {
    return { merged: 0 }
  }

  const existing = await prisma.cocktail.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true }
  })

  if (existing.length === 0) {
    return { merged: 0 }
  }

  await prisma.favorite.createMany({
    data: existing.map(cocktail => ({ userId: user.id, cocktailId: cocktail.id })),
    skipDuplicates: true
  })

  return { merged: existing.length }
})
