import { describe, expect, it } from 'vitest'
import type { CatalogStatsInput } from '../shared/types/stats'
import { buildCatalogStats } from '../shared/types/stats'

function makeInput(overrides: Partial<CatalogStatsInput> = {}): CatalogStatsInput {
  return {
    cocktails: 441,
    ingredients: 299,
    pairings: 1730,
    alcoholicCocktails: 401,
    ibaCocktails: 61,
    sourceModifiedAt: new Date('2018-09-01T10:34:38.000Z'),
    ...overrides
  }
}

describe('buildCatalogStats', () => {
  it('passes the raw catalogue counts through', () => {
    const stats = buildCatalogStats(makeInput())

    expect(stats.cocktails).toBe(441)
    expect(stats.ingredients).toBe(299)
    expect(stats.pairings).toBe(1730)
    expect(stats.alcoholicCocktails).toBe(401)
    expect(stats.ibaCocktails).toBe(61)
  })

  it('derives the zero proof count from the alcoholic split', () => {
    expect(buildCatalogStats(makeInput()).zeroProofCocktails).toBe(40)
  })

  it('never reports a negative zero proof count when the alcoholic count is inconsistent', () => {
    const stats = buildCatalogStats(makeInput({ cocktails: 10, alcoholicCocktails: 25 }))

    expect(stats.alcoholicCocktails).toBe(10)
    expect(stats.zeroProofCocktails).toBe(0)
  })

  it('caps the iba count at the catalogue size', () => {
    expect(buildCatalogStats(makeInput({ cocktails: 5, ibaCocktails: 9 })).ibaCocktails).toBe(5)
  })

  it.each([
    [441, 1730, 3.9],
    [10, 35, 3.5],
    [3, 10, 3.3],
    [3, 11, 3.7],
    [4, 4, 1]
  ])('averages %s cocktails over %s pairings as %s', (cocktails, pairings, expected) => {
    expect(buildCatalogStats(makeInput({ cocktails, pairings })).avgIngredientsPerCocktail).toBe(expected)
  })

  it('returns a zero average instead of dividing by an empty catalogue', () => {
    const stats = buildCatalogStats(makeInput({ cocktails: 0, pairings: 0, alcoholicCocktails: 0, ibaCocktails: 0 }))

    expect(stats.avgIngredientsPerCocktail).toBe(0)
    expect(stats.zeroProofCocktails).toBe(0)
  })

  it.each([
    ['a negative count', -5, 0],
    ['a fractional count', 12.7, 12],
    ['a non finite count', Number.NaN, 0]
  ] as [string, number, number][])('normalises %s to a whole non negative number', (_label, value, expected) => {
    expect(buildCatalogStats(makeInput({ ingredients: value })).ingredients).toBe(expected)
  })

  it('serialises the newest source timestamp as an iso string', () => {
    expect(buildCatalogStats(makeInput()).sourceUpdatedAt).toBe('2018-09-01T10:34:38.000Z')
  })

  it('accepts an already serialised timestamp', () => {
    const stats = buildCatalogStats(makeInput({ sourceModifiedAt: '2018-09-01T10:34:38.000Z' }))

    expect(stats.sourceUpdatedAt).toBe('2018-09-01T10:34:38.000Z')
  })

  it.each([
    ['a missing timestamp', null],
    ['an unparseable timestamp', 'not a date']
  ] as [string, Date | string | null][])('reports %s as null', (_label, value) => {
    expect(buildCatalogStats(makeInput({ sourceModifiedAt: value })).sourceUpdatedAt).toBeNull()
  })

  it('returns only the documented keys', () => {
    expect(Object.keys(buildCatalogStats(makeInput())).sort()).toEqual([
      'alcoholicCocktails',
      'avgIngredientsPerCocktail',
      'cocktails',
      'ibaCocktails',
      'ingredients',
      'pairings',
      'sourceUpdatedAt',
      'zeroProofCocktails'
    ])
  })
})
