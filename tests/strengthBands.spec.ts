import { describe, expect, it } from 'vitest'
import {
  STRENGTH_BANDS,
  STRENGTH_BAND_VALUES,
  UNMEASURED_STRENGTH_LABEL,
  strengthBandLabel,
  strengthBandOf,
  strengthBandRange,
  strengthValueLabel
} from '../shared/types/catalog'
import {
  buildCocktailOrderBy,
  buildCocktailWhere,
  parseCocktailListQuery
} from '../server/utils/catalogQuery'

function badRequestStatus(parse: () => unknown): number | undefined {
  try {
    parse()
  }
  catch (error) {
    return (error as { statusCode?: number }).statusCode
  }

  return undefined
}

function matchesRange(abv: number, range: { gt?: number, gte?: number, lt?: number, lte?: number }): boolean {
  if (range.gt !== undefined && !(abv > range.gt)) return false
  if (range.gte !== undefined && !(abv >= range.gte)) return false
  if (range.lt !== undefined && !(abv < range.lt)) return false
  if (range.lte !== undefined && !(abv <= range.lte)) return false
  return true
}

describe('strength band definition', () => {
  it('declares the house vocabulary in ascending order', () => {
    expect(STRENGTH_BANDS.map(band => band.value)).toEqual([...STRENGTH_BAND_VALUES])
    expect(STRENGTH_BANDS.map(band => band.label)).toEqual([
      'Zero proof',
      'Easy going',
      'Balanced',
      'Strong',
      'Spirit-forward'
    ])
  })

  it.each([
    [0, 'zero'],
    [0.1, 'easy'],
    [9.9, 'easy'],
    [10, 'balanced'],
    [19.9, 'balanced'],
    [20, 'strong'],
    [29.9, 'strong'],
    [30, 'spirit-forward'],
    [35.7, 'spirit-forward'],
    [96, 'spirit-forward']
  ])('classifies %s as %s', (abv, expected) => {
    expect(strengthBandOf(abv)).toBe(expected)
  })

  it('never classifies a missing measurement as zero', () => {
    expect(strengthBandOf(null)).toBeNull()
    expect(strengthBandOf(undefined)).toBeNull()
    expect(strengthBandOf(Number.NaN)).toBeNull()
    expect(strengthBandLabel(null)).toBe(UNMEASURED_STRENGTH_LABEL)
    expect(strengthBandLabel(undefined)).toBe(UNMEASURED_STRENGTH_LABEL)
  })

  it('labels a measured value with its band', () => {
    expect(strengthBandLabel(0)).toBe('Zero proof')
    expect(strengthBandLabel(9.9)).toBe('Easy going')
    expect(strengthBandLabel(10)).toBe('Balanced')
    expect(strengthBandLabel(20)).toBe('Strong')
    expect(strengthBandLabel(30)).toBe('Spirit-forward')
  })

  it('labels a band value and falls back to the raw value', () => {
    expect(strengthValueLabel('spirit-forward')).toBe('Spirit-forward')
    expect(strengthValueLabel('unknown')).toBe('unknown')
  })

  it.each([
    [-1, 'zero'],
    [0, 'zero'],
    [0.05, 'easy'],
    [9.999, 'easy'],
    [10, 'balanced'],
    [19.999, 'balanced'],
    [20, 'strong'],
    [29.999, 'strong'],
    [30, 'spirit-forward']
  ])('puts %s in exactly one band range', (abv, expected) => {
    const matching = STRENGTH_BANDS.filter(band => matchesRange(abv, band.range)).map(band => band.value)
    expect(matching).toEqual([expected])
  })

  it('exposes the range for a band value', () => {
    expect(strengthBandRange('zero')).toEqual({ lte: 0 })
    expect(strengthBandRange('easy')).toEqual({ gt: 0, lt: 10 })
    expect(strengthBandRange('balanced')).toEqual({ gte: 10, lt: 20 })
    expect(strengthBandRange('strong')).toEqual({ gte: 20, lt: 30 })
    expect(strengthBandRange('spirit-forward')).toEqual({ gte: 30 })
  })
})

describe('strength query validation', () => {
  it('accepts every declared band value', () => {
    for (const value of STRENGTH_BAND_VALUES) {
      expect(parseCocktailListQuery({ strength: value }).strength).toBe(value)
    }
  })

  it('rejects an unknown band with a 400', () => {
    expect(badRequestStatus(() => parseCocktailListQuery({ strength: 'boozy' }))).toBe(400)
    expect(badRequestStatus(() => parseCocktailListQuery({ strength: '0' }))).toBe(400)
    expect(badRequestStatus(() => parseCocktailListQuery({ strength: 'ZERO' }))).toBe(400)
  })

  it('treats a blank strength as absent', () => {
    expect(parseCocktailListQuery({ strength: '' })).toEqual({ sort: 'name', page: 1, perPage: 24 })
    expect(parseCocktailListQuery({ strength: '  ' }).strength).toBeUndefined()
  })

  it('accepts both strength sorts and rejects near misses', () => {
    expect(parseCocktailListQuery({ sort: 'strength' }).sort).toBe('strength')
    expect(parseCocktailListQuery({ sort: '-strength' }).sort).toBe('-strength')
    expect(badRequestStatus(() => parseCocktailListQuery({ sort: 'abv' }))).toBe(400)
    expect(badRequestStatus(() => parseCocktailListQuery({ sort: '+strength' }))).toBe(400)
  })

  it('keeps strength alongside the other filters', () => {
    expect(parseCocktailListQuery({ strength: 'strong', spirit: 'gin', alcoholic: 'true', sort: '-strength' }))
      .toEqual({ strength: 'strong', spirit: 'gin', alcoholic: 'true', sort: '-strength', page: 1, perPage: 24 })
  })
})

describe('strength where construction', () => {
  it.each([
    ['zero', { lte: 0 }],
    ['easy', { gt: 0, lt: 10 }],
    ['balanced', { gte: 10, lt: 20 }],
    ['strong', { gte: 20, lt: 30 }],
    ['spirit-forward', { gte: 30 }]
  ])('maps strength=%s to an abv range filter', (strength, expected) => {
    expect(buildCocktailWhere(parseCocktailListQuery({ strength }))).toEqual({ abv: expected })
  })

  it('leaves abv untouched when no strength is requested', () => {
    expect(buildCocktailWhere(parseCocktailListQuery({}))).toEqual({})
    expect(buildCocktailWhere(parseCocktailListQuery({ q: 'mar' })).abv).toBeUndefined()
  })

  it('combines strength with the alcoholic flag and a spirit', () => {
    expect(buildCocktailWhere(parseCocktailListQuery({ strength: 'zero', alcoholic: 'false', spirit: 'gin' })))
      .toEqual({
        abv: { lte: 0 },
        isAlcoholic: false,
        AND: [{ ingredients: { some: { ingredient: { groupSlug: 'gin' } } } }]
      })
  })
})

describe('strength ordering', () => {
  it('sorts ascending with unmeasured drinks last', () => {
    expect(buildCocktailOrderBy('strength'))
      .toEqual([{ abv: { sort: 'asc', nulls: 'last' } }, { nameSort: 'asc' }, { id: 'asc' }])
  })

  it('sorts descending with unmeasured drinks still last', () => {
    expect(buildCocktailOrderBy('-strength'))
      .toEqual([{ abv: { sort: 'desc', nulls: 'last' } }, { nameSort: 'asc' }, { id: 'asc' }])
  })

  it('breaks ties by name then id in both directions', () => {
    for (const sort of ['strength', '-strength'] as const) {
      expect(buildCocktailOrderBy(sort).slice(1)).toEqual([{ nameSort: 'asc' }, { id: 'asc' }])
    }
  })
})
