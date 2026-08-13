import { Prisma } from '@prisma/client'
import type { CocktailCard } from '#shared/types/catalog'

export const userCocktailCardSelect = Prisma.validator<Prisma.CocktailSelect>()({
  id: true,
  slug: true,
  name: true,
  category: true,
  glass: true,
  isAlcoholic: true,
  imageUrl: true,
  imageIsCC: true,
  tags: true
})

type UserCocktailCardRow = Prisma.CocktailGetPayload<{ select: typeof userCocktailCardSelect }>

export function toUserCocktailCard(row: UserCocktailCardRow): CocktailCard {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    glass: row.glass,
    isAlcoholic: row.isAlcoholic,
    imageUrl: row.imageUrl,
    imageIsCC: row.imageIsCC,
    tags: row.tags
  }
}
