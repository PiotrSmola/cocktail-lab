export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const rows = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: [{ createdAt: 'desc' }, { cocktailId: 'desc' }],
    select: { cocktail: { select: userCocktailCardSelect } }
  })

  return { items: rows.map(row => toUserCocktailCard(row.cocktail)) }
})
