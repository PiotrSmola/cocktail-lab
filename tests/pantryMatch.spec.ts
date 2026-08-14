import { describe, expect, it } from 'vitest'
import type { PantryMatchCoreInput, SubstituteIngredientMeta } from '../server/utils/substitutes'
import { buildAcceptedByRequired, buildSubstituteSlugMap, matchPantryCore } from '../server/utils/substitutes'

const LIGHT_RUM = 1
const DARK_RUM = 2
const WHITE_RUM = 3
const OVERPROOF_RUM = 4
const LIME = 5
const MINT = 6
const SODA = 7
const CLUB_SODA = 8
const SUGAR = 9
const COLA = 10
const BITTERS = 11
const PEACH_BITTERS = 12
const GIN = 13

const CATALOGUE: SubstituteIngredientMeta[] = [
  { id: LIGHT_RUM, slug: 'light-rum', isAlcoholic: true },
  { id: DARK_RUM, slug: 'dark-rum', isAlcoholic: true },
  { id: WHITE_RUM, slug: 'white-rum', isAlcoholic: true },
  { id: OVERPROOF_RUM, slug: '151-proof-rum', isAlcoholic: true },
  { id: LIME, slug: 'lime', isAlcoholic: false },
  { id: MINT, slug: 'mint', isAlcoholic: false },
  { id: SODA, slug: 'soda-water', isAlcoholic: false },
  { id: CLUB_SODA, slug: 'club-soda', isAlcoholic: false },
  { id: SUGAR, slug: 'sugar', isAlcoholic: false },
  { id: COLA, slug: 'coca-cola', isAlcoholic: false },
  { id: BITTERS, slug: 'bitters', isAlcoholic: false },
  { id: PEACH_BITTERS, slug: 'peach-bitters', isAlcoholic: true },
  { id: GIN, slug: 'gin', isAlcoholic: true }
]

const MOJITO = 100
const CUBA_LIBRE = 101
const DAIQUIRI = 102
const PINK_GIN = 103
const ZOMBIE = 104

const REQUIRED = new Map<number, number[]>([
  [MOJITO, [LIGHT_RUM, LIME, MINT, SODA, SUGAR]],
  [CUBA_LIBRE, [LIGHT_RUM, COLA, LIME]],
  [DAIQUIRI, [LIGHT_RUM, LIME, SUGAR]],
  [PINK_GIN, [GIN, BITTERS]],
  [ZOMBIE, [OVERPROOF_RUM, LIME, SUGAR]]
])

const accepted = buildAcceptedByRequired(CATALOGUE, buildSubstituteSlugMap())

function run(pantryIds: number[], overrides: Partial<PantryMatchCoreInput> = {}) {
  return matchPantryCore({
    pantryIds,
    requiredByCocktail: REQUIRED,
    acceptedByRequired: accepted,
    ...overrides
  })
}

function makeableIds(result: ReturnType<typeof run>): number[] {
  return result.makeable.map(entry => entry.cocktailId).sort((a, b) => a - b)
}

describe('matchPantryCore — exact matching (regression)', () => {
  it('keeps an exact pantry makeable with no substitutions recorded', () => {
    const result = run([LIGHT_RUM, LIME, MINT, SODA, SUGAR])
    const mojito = result.makeable.find(entry => entry.cocktailId === MOJITO)
    expect(mojito).toBeDefined()
    expect(mojito?.substitutions).toEqual([])
  })

  it('drops a drink to almost when one required line is gone, and lists it in unlocks', () => {
    const result = run([LIME, MINT, SODA, SUGAR])
    const mojito = result.almost.find(entry => entry.cocktailId === MOJITO)
    expect(mojito?.missingIds).toEqual([LIGHT_RUM])
    const unlock = result.unlocks.find(entry => entry.ingredientId === LIGHT_RUM)
    expect(unlock?.cocktailIds).toContain(MOJITO)
    expect(unlock?.exactCount).toBeGreaterThan(0)
  })

  it('behaves exactly like the pre-substitution algorithm when the map is empty', () => {
    const withoutSubstitutes = run([DARK_RUM, LIME, MINT, SODA, SUGAR], {
      acceptedByRequired: new Map()
    })
    expect(makeableIds(withoutSubstitutes)).toEqual([])
    expect(withoutSubstitutes.almost.find(entry => entry.cocktailId === MOJITO)?.missingIds)
      .toEqual([LIGHT_RUM])
  })
})

describe('matchPantryCore — substitutes satisfy requirements', () => {
  it('lets dark rum stand in for light rum', () => {
    const result = run([DARK_RUM, LIME, MINT, SODA, SUGAR])
    const mojito = result.makeable.find(entry => entry.cocktailId === MOJITO)
    expect(mojito).toBeDefined()
    expect(mojito?.substitutions).toEqual([{ requiredId: LIGHT_RUM, substituteId: DARK_RUM }])
  })

  it('lets club soda stand in for soda water', () => {
    const result = run([LIGHT_RUM, LIME, MINT, CLUB_SODA, SUGAR])
    const mojito = result.makeable.find(entry => entry.cocktailId === MOJITO)
    expect(mojito?.substitutions).toEqual([{ requiredId: SODA, substituteId: CLUB_SODA }])
  })

  it('records one substitution line per substituted requirement', () => {
    const result = run([WHITE_RUM, LIME, MINT, CLUB_SODA, SUGAR])
    const mojito = result.makeable.find(entry => entry.cocktailId === MOJITO)
    expect(mojito?.substitutions).toEqual([
      { requiredId: LIGHT_RUM, substituteId: WHITE_RUM },
      { requiredId: SODA, substituteId: CLUB_SODA }
    ])
  })

  it('prefers the exact ingredient over a substitute when the pantry holds both', () => {
    const result = run([LIGHT_RUM, DARK_RUM, LIME, MINT, SODA, SUGAR])
    expect(result.makeable.find(entry => entry.cocktailId === MOJITO)?.substitutions).toEqual([])
  })

  it('picks the lowest ingredient id when several stand-ins are on the shelf', () => {
    const result = run([DARK_RUM, WHITE_RUM, LIME, SUGAR])
    expect(result.makeable.find(entry => entry.cocktailId === DAIQUIRI)?.substitutions)
      .toEqual([{ requiredId: LIGHT_RUM, substituteId: DARK_RUM }])
  })

  it('never substitutes an excluded rum variant', () => {
    const result = run([OVERPROOF_RUM, LIME, MINT, SODA, SUGAR])
    expect(makeableIds(result)).toEqual([ZOMBIE])
    expect(result.almost.find(entry => entry.cocktailId === MOJITO)?.missingIds).toEqual([LIGHT_RUM])
  })

  it('does not let a base rum stand in for the overproof requirement either', () => {
    const result = run([LIGHT_RUM, LIME, SUGAR])
    expect(result.almost.find(entry => entry.cocktailId === ZOMBIE)?.missingIds)
      .toEqual([OVERPROOF_RUM])
  })
})

describe('matchPantryCore — substituted results stay distinguishable', () => {
  it('flags substituted drinks while leaving exact ones unflagged in the same batch', () => {
    const result = run([DARK_RUM, LIME, MINT, SODA, SUGAR, COLA])
    const flags = new Map(result.makeable.map(entry => [entry.cocktailId, entry.substitutions.length]))
    expect(flags.get(MOJITO)).toBe(1)
    expect(flags.get(CUBA_LIBRE)).toBe(1)
    expect(flags.get(DAIQUIRI)).toBe(1)
  })

  it('reports substitutions on almost entries too', () => {
    const result = run([DARK_RUM, LIME, MINT, SUGAR])
    const mojito = result.almost.find(entry => entry.cocktailId === MOJITO)
    expect(mojito?.missingIds).toEqual([SODA])
    expect(mojito?.substitutions).toEqual([{ requiredId: LIGHT_RUM, substituteId: DARK_RUM }])
  })
})

describe('matchPantryCore — alcohol guardrail', () => {
  it('does not let alcoholic peach bitters satisfy the non-alcoholic bitters line', () => {
    const result = run([GIN, PEACH_BITTERS])
    expect(makeableIds(result)).toEqual([])
    expect(result.almost.find(entry => entry.cocktailId === PINK_GIN)?.missingIds).toEqual([BITTERS])
  })

  it('does not offer an alcoholic stand-in as an unlock for a non-alcoholic requirement', () => {
    const result = run([GIN])
    const unlockIds = result.unlocks.map(entry => entry.ingredientId)
    expect(unlockIds).toContain(BITTERS)
    expect(unlockIds).not.toContain(PEACH_BITTERS)
  })

  it('does not let a non-alcoholic stand-in satisfy an alcoholic requirement', () => {
    const crossMap = buildSubstituteSlugMap([['gin', 'sugar']], {})
    const crossAccepted = buildAcceptedByRequired(CATALOGUE, crossMap)
    const result = matchPantryCore({
      pantryIds: [SUGAR, BITTERS],
      requiredByCocktail: REQUIRED,
      acceptedByRequired: crossAccepted
    })
    expect(makeableIds(result)).toEqual([])
    expect(result.almost.find(entry => entry.cocktailId === PINK_GIN)?.missingIds).toEqual([GIN])
  })
})

describe('matchPantryCore — unlocks', () => {
  it('ranks the bottle covering the most one-away drinks first', () => {
    const result = run([LIME, MINT, SODA, SUGAR, COLA])
    const best = result.unlocks[0]
    expect(best?.ingredientId).toBe(LIGHT_RUM)
    expect(best?.cocktailIds.slice().sort((a, b) => a - b)).toEqual([MOJITO, CUBA_LIBRE, DAIQUIRI])
    expect(result.unlocks.find(entry => entry.ingredientId === OVERPROOF_RUM)?.cocktailIds)
      .toEqual([ZOMBIE])
  })

  it('counts a bottle that stands in for several different named variants', () => {
    const darkOnlyDrink = 200
    const required = new Map([...REQUIRED, [darkOnlyDrink, [DARK_RUM, LIME]]])
    const result = matchPantryCore({
      pantryIds: [LIME, MINT, SODA, SUGAR, COLA],
      requiredByCocktail: required,
      acceptedByRequired: accepted
    })
    const best = result.unlocks[0]
    expect(best?.ingredientId).toBe(LIGHT_RUM)
    expect(best?.cocktailIds.slice().sort((a, b) => a - b))
      .toEqual([MOJITO, CUBA_LIBRE, DAIQUIRI, darkOnlyDrink])
    expect(best?.exactCount).toBe(3)
    expect(best?.substitutesForIds).toEqual([DARK_RUM])
  })

  it('collapses interchangeable stand-ins that cover nothing extra into one recommendation', () => {
    const result = run([LIME, MINT, SODA, SUGAR, COLA])
    const ids = result.unlocks.map(entry => entry.ingredientId)
    expect(ids).toContain(LIGHT_RUM)
    expect(ids).not.toContain(DARK_RUM)
    expect(ids).not.toContain(WHITE_RUM)
  })

  it('keeps a stand-in that covers a drink the top pick does not', () => {
    const result = run([LIME, SUGAR])
    const ids = result.unlocks.map(entry => entry.ingredientId)
    expect(ids).toContain(LIGHT_RUM)
    expect(ids).toContain(OVERPROOF_RUM)
    expect(ids).not.toContain(DARK_RUM)
  })

  it('ties break towards the ingredient the recipes actually name', () => {
    const result = run([LIME, SUGAR])
    const rumCandidates = result.unlocks.filter(entry => entry.cocktailIds.includes(DAIQUIRI))
    expect(rumCandidates[0]?.ingredientId).toBe(LIGHT_RUM)
    expect(rumCandidates[0]?.exactCount).toBe(1)
  })

  it('never proposes something already in the pantry', () => {
    const result = run([LIGHT_RUM, LIME, MINT, SUGAR])
    const ids = result.unlocks.map(entry => entry.ingredientId)
    expect(ids).not.toContain(LIGHT_RUM)
    expect(ids).toContain(SODA)
    expect(ids).not.toContain(CLUB_SODA)
  })

  it('ignores drinks that are two ingredients away', () => {
    const result = run([LIME])
    expect(result.almost.map(entry => entry.cocktailId)).toContain(DAIQUIRI)
    expect(result.unlocks).toEqual([])
  })
})

describe('matchPantryCore — boundaries and degenerate input', () => {
  it('treats exactly two missing as almost and three as out of range', () => {
    const twoAway = run([LIGHT_RUM, LIME, MINT])
    expect(twoAway.almost.find(entry => entry.cocktailId === MOJITO)?.missingIds.sort((a, b) => a - b))
      .toEqual([SODA, SUGAR])

    const threeAway = run([LIGHT_RUM, LIME])
    expect(threeAway.almost.map(entry => entry.cocktailId)).not.toContain(MOJITO)
  })

  it('respects a custom maxMissing', () => {
    const result = run([LIGHT_RUM, LIME, MINT], { maxMissing: 1 })
    expect(result.almost.map(entry => entry.cocktailId)).not.toContain(MOJITO)
  })

  it('returns nothing for an empty pantry', () => {
    expect(run([])).toEqual({ makeable: [], almost: [], unlocks: [] })
  })

  it('ignores ingredient ids that are not in any recipe', () => {
    const result = run([9999])
    expect(result.makeable).toEqual([])
    expect(result.almost.every(entry => entry.substitutions.length === 0)).toBe(true)
    expect(result.almost.map(entry => entry.cocktailId)).toEqual([PINK_GIN])
    expect(result.unlocks).toEqual([])
  })

  it('skips cocktails with no required lines', () => {
    const result = matchPantryCore({
      pantryIds: [LIME],
      requiredByCocktail: new Map([[500, []], [501, [LIME]]]),
      acceptedByRequired: accepted
    })
    expect(makeableIds(result)).toEqual([501])
  })

  it('deduplicates repeated required ingredient ids', () => {
    const result = matchPantryCore({
      pantryIds: [LIME],
      requiredByCocktail: new Map([[600, [LIME, LIME, LIME]]]),
      acceptedByRequired: accepted
    })
    expect(makeableIds(result)).toEqual([600])
  })
})
