import { z } from 'zod'

const paramsSchema = z.object({
  cocktailId: z.coerce.number().int().positive()
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const { cocktailId } = await getValidatedRouterParams(event, paramsSchema.parse)

  await prisma.favorite.deleteMany({
    where: { userId: user.id, cocktailId }
  })

  return { ok: true }
})
