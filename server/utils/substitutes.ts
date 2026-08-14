export interface SubstituteIngredientMeta {
  id: number
  slug: string
  isAlcoholic: boolean
}

export interface SubstitutionRef {
  requiredId: number
  substituteId: number
}

export interface MakeableMatch {
  cocktailId: number
  substitutions: SubstitutionRef[]
}

export interface AlmostMatch {
  cocktailId: number
  missingIds: number[]
  substitutions: SubstitutionRef[]
}

export interface UnlockMatch {
  ingredientId: number
  cocktailIds: number[]
  exactCount: number
  substitutesForIds: number[]
}

export interface PantryMatchCore {
  makeable: MakeableMatch[]
  almost: AlmostMatch[]
  unlocks: UnlockMatch[]
}

export interface PantryMatchCoreInput {
  pantryIds: Iterable<number>
  requiredByCocktail: ReadonlyMap<number, readonly number[]>
  acceptedByRequired: ReadonlyMap<number, ReadonlySet<number>>
  maxMissing?: number
}

export const SUBSTITUTE_CLUSTERS: readonly (readonly string[])[] = [
  ['rum', 'light-rum', 'white-rum', 'gold-rum', 'dark-rum', 'anejo-rum'],
  ['whiskey', 'whisky', 'blended-whiskey', 'bourbon', 'rye-whiskey', 'tennessee-whiskey', 'jack-daniels', 'wild-turkey'],
  ['whiskey', 'whisky', 'scotch', 'blended-scotch', 'islay-single-malt-scotch'],
  ['whiskey', 'whisky', 'irish-whiskey'],
  ['vodka', 'absolut-vodka'],
  ['vermouth', 'sweet-vermouth', 'rosso-vermouth'],
  ['vermouth', 'dry-vermouth'],
  ['brandy', 'cognac'],
  ['triple-sec', 'cointreau', 'orange-curacao'],
  ['kahlua', 'tia-maria', 'coffee-liqueur', 'coffee-brandy'],
  ['irish-cream', 'baileys-irish-cream'],
  ['champagne', 'prosecco'],
  ['soda-water', 'club-soda', 'carbonated-water'],
  ['coca-cola', 'pepsi-cola'],
  ['lemon-lime-soda', 'sprite', '7-up'],
  ['lemonade', 'pink-lemonade'],
  ['cream', 'light-cream', 'heavy-cream', 'whipping-cream', 'half-and-half'],
  ['sweet-and-sour', 'sour-mix'],
  ['sugar', 'powdered-sugar', 'sugar-syrup'],
  ['sugar-syrup', 'agave-syrup'],
  ['honey', 'honey-syrup'],
  ['lemon-juice', 'fresh-lemon-juice'],
  ['lime-juice', 'fresh-lime-juice'],
  ['coffee', 'espresso']
]

export const DIRECTED_SUBSTITUTES: Readonly<Record<string, readonly string[]>> = {
  bitters: ['angostura-bitters', 'orange-bitters', 'peychaud-bitters', 'peach-bitters'],
  'lemon-juice': ['lemon'],
  'fresh-lemon-juice': ['lemon'],
  'lime-juice': ['lime'],
  'fresh-lime-juice': ['lime'],
  'orange-juice': ['orange'],
  'lemon-peel': ['lemon'],
  'lime-peel': ['lime'],
  'orange-peel': ['orange', 'orange-spiral'],
  'orange-spiral': ['orange', 'orange-peel'],
  'egg-white': ['egg'],
  'egg-yolk': ['egg']
}

export function buildSubstituteSlugMap(
  clusters: readonly (readonly string[])[] = SUBSTITUTE_CLUSTERS,
  directed: Readonly<Record<string, readonly string[]>> = DIRECTED_SUBSTITUTES
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()

  const link = (required: string, substitute: string): void => {
    if (required === substitute) {
      return
    }
    const existing = map.get(required)
    if (existing) {
      existing.add(substitute)
    }
    else {
      map.set(required, new Set([substitute]))
    }
  }

  for (const cluster of clusters) {
    for (const required of cluster) {
      for (const substitute of cluster) {
        link(required, substitute)
      }
    }
  }

  for (const [required, substitutes] of Object.entries(directed)) {
    for (const substitute of substitutes) {
      link(required, substitute)
    }
  }

  return map
}

export function buildAcceptedByRequired(
  ingredients: readonly SubstituteIngredientMeta[],
  slugMap: ReadonlyMap<string, ReadonlySet<string>> = buildSubstituteSlugMap()
): Map<number, Set<number>> {
  const bySlug = new Map<string, SubstituteIngredientMeta>()
  for (const ingredient of ingredients) {
    bySlug.set(ingredient.slug, ingredient)
  }

  const accepted = new Map<number, Set<number>>()

  for (const ingredient of ingredients) {
    const substituteSlugs = slugMap.get(ingredient.slug)
    if (!substituteSlugs) {
      continue
    }

    const ids: number[] = []
    for (const slug of substituteSlugs) {
      const candidate = bySlug.get(slug)
      if (!candidate || candidate.id === ingredient.id) {
        continue
      }
      if (candidate.isAlcoholic !== ingredient.isAlcoholic) {
        continue
      }
      ids.push(candidate.id)
    }

    if (ids.length > 0) {
      accepted.set(ingredient.id, new Set(ids.sort((a, b) => a - b)))
    }
  }

  return accepted
}

const DEFAULT_MAX_MISSING = 2

export function matchPantryCore(input: PantryMatchCoreInput): PantryMatchCore {
  const pantry = new Set(input.pantryIds)
  const maxMissing = input.maxMissing ?? DEFAULT_MAX_MISSING

  const makeable: MakeableMatch[] = []
  const almost: AlmostMatch[] = []

  if (pantry.size === 0) {
    return { makeable, almost, unlocks: [] }
  }

  const findStandIn = (requiredId: number): number | null => {
    const accepted = input.acceptedByRequired.get(requiredId)
    if (!accepted) {
      return null
    }
    for (const candidateId of accepted) {
      if (pantry.has(candidateId)) {
        return candidateId
      }
    }
    return null
  }

  for (const [cocktailId, required] of input.requiredByCocktail) {
    const uniqueRequired = [...new Set(required)]
    if (uniqueRequired.length === 0) {
      continue
    }

    const missingIds: number[] = []
    const substitutions: SubstitutionRef[] = []

    for (const requiredId of uniqueRequired) {
      if (pantry.has(requiredId)) {
        continue
      }
      const substituteId = findStandIn(requiredId)
      if (substituteId === null) {
        missingIds.push(requiredId)
      }
      else {
        substitutions.push({ requiredId, substituteId })
      }
    }

    if (missingIds.length === 0) {
      makeable.push({ cocktailId, substitutions })
    }
    else if (missingIds.length <= maxMissing) {
      almost.push({ cocktailId, missingIds, substitutions })
    }
  }

  const unlockDraft = new Map<number, { cocktailIds: number[], exactCount: number, substitutesForIds: Set<number> }>()

  for (const entry of almost) {
    if (entry.missingIds.length !== 1) {
      continue
    }
    const requiredId = entry.missingIds[0]
    if (requiredId === undefined) {
      continue
    }

    const candidates = [requiredId, ...(input.acceptedByRequired.get(requiredId) ?? [])]
    for (const candidateId of candidates) {
      if (pantry.has(candidateId)) {
        continue
      }
      const draft = unlockDraft.get(candidateId)
        ?? { cocktailIds: [], exactCount: 0, substitutesForIds: new Set<number>() }
      draft.cocktailIds.push(entry.cocktailId)
      if (candidateId === requiredId) {
        draft.exactCount += 1
      }
      else {
        draft.substitutesForIds.add(requiredId)
      }
      unlockDraft.set(candidateId, draft)
    }
  }

  const ranked: UnlockMatch[] = [...unlockDraft]
    .map(([ingredientId, draft]) => ({
      ingredientId,
      cocktailIds: draft.cocktailIds,
      exactCount: draft.exactCount,
      substitutesForIds: [...draft.substitutesForIds].sort((a, b) => a - b)
    }))
    .sort((a, b) =>
      b.cocktailIds.length - a.cocktailIds.length
      || b.exactCount - a.exactCount
      || a.ingredientId - b.ingredientId)

  const interchangeable = (a: number, b: number): boolean =>
    input.acceptedByRequired.get(a)?.has(b) === true
    || input.acceptedByRequired.get(b)?.has(a) === true

  const unlocks: UnlockMatch[] = []
  const keptCoverage: { ingredientId: number, cocktailIds: Set<number> }[] = []

  for (const candidate of ranked) {
    const redundant = keptCoverage.some(kept =>
      interchangeable(kept.ingredientId, candidate.ingredientId)
      && candidate.cocktailIds.every(cocktailId => kept.cocktailIds.has(cocktailId)))

    if (redundant) {
      continue
    }

    unlocks.push(candidate)
    keptCoverage.push({ ingredientId: candidate.ingredientId, cocktailIds: new Set(candidate.cocktailIds) })
  }

  return { makeable, almost, unlocks }
}
