import { z } from 'zod'

const paramsSchema = z.object({
  cocktailId: z.coerce.number().int().positive()
})

const bodySchema = z.object({
  body: z.string().max(2000),
  rating: z.number().int().min(1).max(5).nullable().default(null)
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const { cocktailId } = await getValidatedRouterParams(event, paramsSchema.parse)
  const { body, rating } = await readValidatedBody(event, bodySchema.parse)

  const cocktail = await prisma.cocktail.findUnique({
    where: { id: cocktailId },
    select: { id: true }
  })

  if (!cocktail) {
    throw createError({ statusCode: 404, statusMessage: 'Cocktail not found' })
  }

  await prisma.note.upsert({
    where: { userId_cocktailId: { userId: user.id, cocktailId } },
    create: { userId: user.id, cocktailId, body, rating },
    update: { body, rating }
  })

  return { ok: true }
})
