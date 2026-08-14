const STATIC_ENTRIES = [
  { loc: '/', priority: 1, changefreq: 'weekly' },
  { loc: '/cocktails', priority: 0.9, changefreq: 'weekly' },
  { loc: '/ingredients', priority: 0.8, changefreq: 'weekly' },
  { loc: '/pantry', priority: 0.7, changefreq: 'monthly' }
] as const

export default defineSitemapEventHandler(async () => {
  const [cocktails, ingredients] = await Promise.all([
    prisma.cocktail.findMany({
      select: { slug: true, sourceModifiedAt: true },
      orderBy: { slug: 'asc' }
    }),
    prisma.ingredient.findMany({
      select: { slug: true },
      orderBy: { slug: 'asc' }
    })
  ])

  return [
    ...STATIC_ENTRIES,
    ...cocktails.map(cocktail => ({
      loc: `/cocktails/${cocktail.slug}`,
      lastmod: cocktail.sourceModifiedAt ?? undefined,
      priority: 0.7 as const,
      changefreq: 'yearly' as const
    })),
    ...ingredients.map(ingredient => ({
      loc: `/ingredients/${ingredient.slug}`,
      priority: 0.6 as const,
      changefreq: 'yearly' as const
    }))
  ]
})
