import { z } from 'zod'
import type { PantryMatchResult } from '#shared/types/pantry'

const matchBodySchema = z.object({
  ingredients: z.array(z.string().min(1).max(200)).min(1).max(100),
})

const cocktailCardSelect = {
  id: true,
  slug: true,
  name: true,
  category: true,
  glass: true,
  isAlcoholic: true,
  imageUrl: true,
  imageIsCC: true,
  tags: true,
} as const

const ingredientLiteSelect = {
  id: true,
  slug: true,
  name: true,
  imageUrl: true,
  isAlcoholic: true,
  abv: true,
  abvEstimated: true,
  groupSlug: true,
} as const

const MAX_MISSING_FOR_ALMOST = 2
const ALMOST_LIMIT = 30
const UNLOCKS_LIMIT = 5
const UNLOCK_EXAMPLES_LIMIT = 5

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

function byName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name)
}

function emptyResult(pantryCount: number): PantryMatchResult {
  return { pantryCount, makeable: [], almost: [], unlocks: [] }
}

export default defineEventHandler(async (event): Promise<PantryMatchResult> => {
  const { ingredients } = await readValidatedBody(event, body => matchBodySchema.parse(body))

  const requestedSlugs = [...new Set(
    ingredients.map(slug => slug.trim().toLowerCase()).filter(slug => slug.length > 0),
  )]

  const pantryIngredients = requestedSlugs.length > 0
    ? await prisma.ingredient.findMany({
        where: { slug: { in: requestedSlugs } },
        select: { id: true },
      })
    : []

  const pantryIds = new Set(pantryIngredients.map(ingredient => ingredient.id))
  if (pantryIds.size === 0) {
    return emptyResult(0)
  }

  const requiredLines = await prisma.cocktailIngredient.findMany({
    where: { optional: false, garnish: false },
    select: { cocktailId: true, ingredientId: true },
  })

  const requiredByCocktail = new Map<number, Set<number>>()
  for (const line of requiredLines) {
    const existing = requiredByCocktail.get(line.cocktailId)
    if (existing) {
      existing.add(line.ingredientId)
    }
    else {
      requiredByCocktail.set(line.cocktailId, new Set([line.ingredientId]))
    }
  }

  const makeableIds: number[] = []
  const missingByCocktail = new Map<number, number[]>()

  for (const [cocktailId, required] of requiredByCocktail) {
    if (required.size === 0) {
      continue
    }
    const missing = [...required].filter(ingredientId => !pantryIds.has(ingredientId))
    if (missing.length === 0) {
      makeableIds.push(cocktailId)
    }
    else if (missing.length <= MAX_MISSING_FOR_ALMOST) {
      missingByCocktail.set(cocktailId, missing)
    }
  }

  const candidateCocktailIds = [...makeableIds, ...missingByCocktail.keys()]
  if (candidateCocktailIds.length === 0) {
    return emptyResult(pantryIds.size)
  }

  const missingIngredientIds = [...new Set([...missingByCocktail.values()].flat())]

  const [cocktailRows, ingredientRows] = await Promise.all([
    prisma.cocktail.findMany({
      where: { id: { in: candidateCocktailIds } },
      select: cocktailCardSelect,
    }),
    missingIngredientIds.length > 0
      ? prisma.ingredient.findMany({
          where: { id: { in: missingIngredientIds } },
          select: ingredientLiteSelect,
        })
      : [],
  ])

  const cocktailById = new Map(cocktailRows.map(cocktail => [cocktail.id, cocktail]))
  const ingredientById = new Map(ingredientRows.map(ingredient => [ingredient.id, ingredient]))

  const makeable = makeableIds
    .map(cocktailId => cocktailById.get(cocktailId))
    .filter(isPresent)
    .sort(byName)

  const almost = [...missingByCocktail]
    .map(([cocktailId, missingIds]) => {
      const cocktail = cocktailById.get(cocktailId)
      const missing = missingIds.map(id => ingredientById.get(id)).filter(isPresent).sort(byName)
      return cocktail && missing.length > 0 ? { cocktail, missing } : null
    })
    .filter(isPresent)
    .sort((a, b) => a.missing.length - b.missing.length || byName(a.cocktail, b.cocktail))

  const unlockedNamesByIngredient = new Map<number, string[]>()
  for (const entry of almost) {
    if (entry.missing.length !== 1) {
      continue
    }
    const [ingredient] = entry.missing
    if (!ingredient) {
      continue
    }
    const names = unlockedNamesByIngredient.get(ingredient.id)
    if (names) {
      names.push(entry.cocktail.name)
    }
    else {
      unlockedNamesByIngredient.set(ingredient.id, [entry.cocktail.name])
    }
  }

  const unlocks = [...unlockedNamesByIngredient]
    .map(([ingredientId, names]) => {
      const ingredient = ingredientById.get(ingredientId)
      return ingredient
        ? { ingredient, unlocksCount: names.length, cocktails: names.slice(0, UNLOCK_EXAMPLES_LIMIT) }
        : null
    })
    .filter(isPresent)
    .sort((a, b) => b.unlocksCount - a.unlocksCount || byName(a.ingredient, b.ingredient))
    .slice(0, UNLOCKS_LIMIT)

  return {
    pantryCount: pantryIds.size,
    makeable,
    almost: almost.slice(0, ALMOST_LIMIT),
    unlocks,
  }
})
