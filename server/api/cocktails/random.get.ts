export default defineEventHandler(async (): Promise<{ slug: string }> => {
  const total = await prisma.cocktail.count()

  if (total === 0) {
    throw createError({ statusCode: 404, statusMessage: 'No cocktails available' })
  }

  const [cocktail] = await prisma.cocktail.findMany({
    select: { slug: true },
    orderBy: { id: 'asc' },
    skip: Math.floor(Math.random() * total),
    take: 1
  })

  if (!cocktail) {
    throw createError({ statusCode: 404, statusMessage: 'No cocktails available' })
  }

  return { slug: cocktail.slug }
})
