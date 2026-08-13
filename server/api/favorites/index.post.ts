import { z } from 'zod'

const bodySchema = z.object({
  cocktailId: z.number().int().positive()
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const { cocktailId } = await readValidatedBody(event, bodySchema.parse)

  const cocktail = await prisma.cocktail.findUnique({
    where: { id: cocktailId },
    select: { id: true }
  })

  if (!cocktail) {
    throw createError({ statusCode: 404, statusMessage: 'Cocktail not found' })
  }

  await prisma.favorite.upsert({
    where: { userId_cocktailId: { userId: user.id, cocktailId } },
    create: { userId: user.id, cocktailId },
    update: {}
  })

  return { ok: true }
})
