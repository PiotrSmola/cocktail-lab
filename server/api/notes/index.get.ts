export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const rows = await prisma.note.findMany({
    where: { userId: user.id },
    orderBy: [{ updatedAt: 'desc' }, { cocktailId: 'desc' }],
    select: {
      body: true,
      rating: true,
      updatedAt: true,
      cocktail: { select: userCocktailCardSelect }
    }
  })

  return {
    items: rows.map(row => ({
      cocktail: toUserCocktailCard(row.cocktail),
      body: row.body,
      rating: row.rating,
      updatedAt: row.updatedAt.toISOString()
    }))
  }
})
