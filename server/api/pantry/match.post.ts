import { z } from 'zod'
import { cocktailCardSelect, ingredientLiteSelect } from '~~/server/utils/catalogQuery'
import { buildAcceptedByRequired, matchPantryCore } from '~~/server/utils/substitutes'
import type { SubstitutionRef } from '~~/server/utils/substitutes'
import type { PantryMatchResult, PantrySubstitution } from '#shared/types/pantry'

const matchBodySchema = z.object({
  ingredients: z.array(z.string().min(1).max(200)).min(1).max(300),
})

const MAX_MISSING_FOR_ALMOST = 2
const ALMOST_LIMIT = 30
const UNLOCKS_LIMIT = 5
const UNLOCK_EXAMPLES_LIMIT = 5

interface PantryIndex {
  idBySlug: Map<string, number>
  requiredByCocktail: Map<number, number[]>
  acceptedByRequired: Map<number, Set<number>>
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

function byName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name)
}

function emptyResult(pantryCount: number): PantryMatchResult {
  return { pantryCount, makeable: [], almost: [], unlocks: [], exactCount: 0, substituted: [] }
}

let pantryIndexPromise: Promise<PantryIndex> | null = null

async function buildPantryIndex(): Promise<PantryIndex> {
  const [requiredLines, ingredients] = await Promise.all([
    prisma.cocktailIngredient.findMany({
      where: { optional: false, garnish: false },
      select: { cocktailId: true, ingredientId: true },
    }),
    prisma.ingredient.findMany({
      select: { id: true, slug: true, isAlcoholic: true },
    }),
  ])

  const requiredByCocktail = new Map<number, number[]>()
  for (const line of requiredLines) {
    const existing = requiredByCocktail.get(line.cocktailId)
    if (existing) {
      existing.push(line.ingredientId)
    }
    else {
      requiredByCocktail.set(line.cocktailId, [line.ingredientId])
    }
  }

  return {
    idBySlug: new Map(ingredients.map(ingredient => [ingredient.slug, ingredient.id])),
    requiredByCocktail,
    acceptedByRequired: buildAcceptedByRequired(ingredients),
  }
}

function loadPantryIndex(): Promise<PantryIndex> {
  pantryIndexPromise ??= buildPantryIndex().catch((error: unknown) => {
    pantryIndexPromise = null
    throw error
  })

  return pantryIndexPromise
}

export default defineEventHandler(async (event): Promise<PantryMatchResult> => {
  const { ingredients } = await readValidatedBody(event, body => matchBodySchema.parse(body))

  const requestedSlugs = [...new Set(
    ingredients.map(slug => slug.trim().toLowerCase()).filter(slug => slug.length > 0),
  )]

  if (requestedSlugs.length === 0) {
    return emptyResult(0)
  }

  const index = await loadPantryIndex()

  const pantryIds = new Set(
    requestedSlugs.map(slug => index.idBySlug.get(slug)).filter(isPresent),
  )
  if (pantryIds.size === 0) {
    return emptyResult(0)
  }

  const core = matchPantryCore({
    pantryIds,
    requiredByCocktail: index.requiredByCocktail,
    acceptedByRequired: index.acceptedByRequired,
    maxMissing: MAX_MISSING_FOR_ALMOST,
  })

  if (core.makeable.length === 0 && core.almost.length === 0) {
    return emptyResult(pantryIds.size)
  }

  const rankedUnlocks = core.unlocks.slice(0, UNLOCKS_LIMIT * 4)

  const cocktailIds = [
    ...core.makeable.map(entry => entry.cocktailId),
    ...core.almost.map(entry => entry.cocktailId),
  ]

  const ingredientIds = new Set<number>()
  for (const entry of [...core.makeable, ...core.almost]) {
    for (const line of entry.substitutions) {
      ingredientIds.add(line.requiredId)
      ingredientIds.add(line.substituteId)
    }
  }
  for (const entry of core.almost) {
    for (const id of entry.missingIds) {
      ingredientIds.add(id)
    }
  }
  for (const unlock of rankedUnlocks) {
    ingredientIds.add(unlock.ingredientId)
    for (const id of unlock.substitutesForIds) {
      ingredientIds.add(id)
    }
  }

  const [cocktailRows, ingredientRows] = await Promise.all([
    prisma.cocktail.findMany({
      where: { id: { in: cocktailIds } },
      select: cocktailCardSelect,
    }),
    ingredientIds.size > 0
      ? prisma.ingredient.findMany({
          where: { id: { in: [...ingredientIds] } },
          select: ingredientLiteSelect,
        })
      : [],
  ])

  const cocktailById = new Map(cocktailRows.map(cocktail => [cocktail.id, cocktail]))
  const ingredientById = new Map(ingredientRows.map(ingredient => [ingredient.id, ingredient]))

  const hydrateSubstitutions = (lines: readonly SubstitutionRef[]): PantrySubstitution[] =>
    lines
      .map((line) => {
        const required = ingredientById.get(line.requiredId)
        const substitute = ingredientById.get(line.substituteId)
        return required && substitute ? { required, substitute } : null
      })
      .filter(isPresent)
      .sort((a, b) => byName(a.required, b.required))

  const makeableEntries = core.makeable
    .map((entry) => {
      const cocktail = cocktailById.get(entry.cocktailId)
      return cocktail ? { cocktail, substitutions: hydrateSubstitutions(entry.substitutions) } : null
    })
    .filter(isPresent)
    .sort((a, b) =>
      Number(a.substitutions.length > 0) - Number(b.substitutions.length > 0)
      || byName(a.cocktail, b.cocktail))

  const makeable = makeableEntries.map(entry => entry.cocktail)
  const exactCount = makeableEntries.filter(entry => entry.substitutions.length === 0).length
  const substituted = makeableEntries
    .filter(entry => entry.substitutions.length > 0)
    .map(entry => ({ cocktailId: entry.cocktail.id, substitutions: entry.substitutions }))

  const almost = core.almost
    .map((entry) => {
      const cocktail = cocktailById.get(entry.cocktailId)
      const missing = entry.missingIds.map(id => ingredientById.get(id)).filter(isPresent).sort(byName)
      return cocktail && missing.length > 0
        ? { cocktail, missing, substitutions: hydrateSubstitutions(entry.substitutions) }
        : null
    })
    .filter(isPresent)
    .sort((a, b) => a.missing.length - b.missing.length || byName(a.cocktail, b.cocktail))

  const cocktailNameById = new Map(cocktailRows.map(cocktail => [cocktail.id, cocktail.name]))

  const unlocks = rankedUnlocks
    .map((unlock) => {
      const ingredient = ingredientById.get(unlock.ingredientId)
      if (!ingredient) {
        return null
      }
      const names = unlock.cocktailIds
        .map(id => cocktailNameById.get(id))
        .filter(isPresent)
        .sort((a, b) => a.localeCompare(b))
      if (names.length === 0) {
        return null
      }
      return {
        ingredient,
        unlocksCount: names.length,
        cocktails: names.slice(0, UNLOCK_EXAMPLES_LIMIT),
        substitutesFor: unlock.substitutesForIds
          .map(id => ingredientById.get(id))
          .filter(isPresent)
          .sort(byName),
        exactCount: unlock.exactCount,
      }
    })
    .filter(isPresent)
    .sort((a, b) =>
      b.unlocksCount - a.unlocksCount
      || b.exactCount - a.exactCount
      || byName(a.ingredient, b.ingredient))
    .slice(0, UNLOCKS_LIMIT)
    .map(({ exactCount: _exactCount, ...unlock }) => unlock)

  return {
    pantryCount: pantryIds.size,
    makeable,
    almost: almost.slice(0, ALMOST_LIMIT),
    unlocks,
    exactCount,
    substituted,
  }
})
